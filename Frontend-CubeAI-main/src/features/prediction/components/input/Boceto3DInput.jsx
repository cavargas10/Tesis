import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  Sparkle,
  PencilSimple,
  Eraser,
  Trash,
  TextAa,
} from "@phosphor-icons/react";
import { ErrorModal } from "../../../../components/modals/ErrorModal";
import { LoadingModal } from "../../../../components/modals/LoadingModal";
import { Boceto3DResult } from "../results/Boceto3DResult";
import { usePredictionHandler } from "../../hooks/usePredictionHandler";
import { useCanvasDrawing } from "../../hooks/useCanvasDrawing";
import { useAuth } from "../../../auth/hooks/useAuth";
import { usePredictions } from "../../context/PredictionContext";
import { uploadPredictionPreview } from "../../services/predictionApi";
import { useTranslation } from "react-i18next";

function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(","),
    mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export const Boceto3DInput = ({ isCollapsed }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { dispatch, clearResult, prediction_boceto3d_result } =
    usePredictions();
  const [generationName, setGenerationName] = useState("");
  const [description, setDescription] = useState("");

  const {
    isSubmitting,
    submissionError,
    loadingSteps,
    submitPrediction,
    clearSubmissionError,
    setSubmissionError,
    taskId,
    taskStatus,
    taskData,
    resetTaskState,
  } = usePredictionHandler(user);

  const canvasConfig = useMemo(
    () => ({
      width: 800,
      height: 400,
      pencilConfig: { strokeStyle: "#000000", lineWidth: 2, lineCap: "round" },
      eraserSize: 20,
      backgroundColor: "#FFFFFF",
    }),
    []
  );

  const {
    drawingState,
    setDrawingState,
    initializeCanvas,
    startDrawing,
    stopDrawing,
    handleDraw,
    clearCanvas,
    isCanvasEmpty,
  } = useCanvasDrawing(canvasConfig);

  const canvasForDataRef = useRef(null);

  const initializeLocalCanvas = useCallback(
    (node) => {
      if (node) {
        initializeCanvas(node);
        canvasForDataRef.current = node;
      }
    },
    [initializeCanvas]
  );

  const getCanvasDataURL = useCallback((type = "image/png", quality) => {
    if (!canvasForDataRef.current) return null;
    return canvasForDataRef.current.toDataURL(type, quality);
  }, []);

  const setTool = useCallback(
    (newTool) => {
      setDrawingState((prev) => ({ ...prev, tool: newTool }));
    },
    [setDrawingState]
  );

  const drawingHandlers = useMemo(
    () => ({
      onMouseDown: startDrawing,
      onMouseUp: stopDrawing,
      onMouseLeave: stopDrawing,
      onMouseMove: handleDraw,
      onTouchStart: startDrawing,
      onTouchEnd: stopDrawing,
      onTouchMove: handleDraw,
    }),
    [startDrawing, stopDrawing, handleDraw]
  );

  const dataURLtoFile = useCallback(
    (dataURL, filename) => {
      try {
        const arr = dataURL.split(",");
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : "image/png";
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
      } catch (error) {
        setSubmissionError(t("errors.processing_sketch_error") || "Error al procesar el boceto. Intente de nuevo.");
        return null;
      }
    },
    [setSubmissionError, t]
  );

  const resetComponentState = useCallback((clearTask = false) => {
    setGenerationName("");
    setDescription("");
    clearSubmissionError();
    clearResult("boceto3d");
    clearCanvas();
    if (clearTask) {
      resetTaskState();
    }
  }, [clearCanvas, clearSubmissionError, clearResult, resetTaskState]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      resetComponentState(true); // Clear everything including task state
    };
  }, [resetComponentState]);

  // Effect to handle updates from task polling
  useEffect(() => {
    if (taskStatus === "SUCCESS" && taskData) {
      dispatch({ type: 'SET_PREDICTION', payload: { type: 'boceto3d', result: taskData } });
      clearSubmissionError();
    } else if (taskStatus === "FAILURE") {
      clearResult('boceto3d');
    }
  }, [taskStatus, taskData, dispatch, clearResult, clearSubmissionError]);

  const handleLocalPrediction = useCallback(async () => {
    if (!generationName.trim()) {
      setSubmissionError(t("generation_pages.common.error_name_required") || "Por favor, ingrese un nombre para la generación.");
      return;
    }
    if (isCanvasEmpty()) {
      setSubmissionError(t("generation_pages.sketch_to_3d.error_draw_something") || "Por favor, dibuje algo en el lienzo antes de generar.");
      return;
    }

    resetComponentState(true); // Clear previous states and task

    const image = getCanvasDataURL("image/png");
    if (!image) {
      setSubmissionError(t("generation_pages.sketch_to_3d.error_get_canvas_image") || "No se pudo obtener la imagen del lienzo.");
      return;
    }
    const imageFile = dataURLtoFile(image, "boceto.png");
    if (!imageFile) return; // dataURLtoFile already sets an error

    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("generationName", generationName);
    formData.append("description", description);

    // submitPrediction is now handled by usePredictionHandler,
    // which will set isSubmitting, submissionError, taskId, taskStatus
    await submitPrediction("boceto3D", formData);
    // Result dispatching is handled by the useEffect listening to taskStatus and taskData
  }, [
    generationName,
    description,
    submitPrediction,
    getCanvasDataURL,
    isCanvasEmpty,
    dataURLtoFile,
    setSubmissionError,
    resetComponentState,
    t
  ]);

  const handlePreviewUpload = useCallback(
    async (dataURL) => {
      if (
        !user ||
        !prediction_boceto3d_result ||
        !prediction_boceto3d_result.generation_name
      )
        return;
      if (prediction_boceto3d_result.previewImageUrl) return;

      try {
        const token = await user.getIdToken();
        const previewBlob = dataURLtoBlob(dataURL);

        const formData = new FormData();
        formData.append("preview", previewBlob, "preview.png");
        formData.append(
          "generation_name",
          prediction_boceto3d_result.generation_name
        );
        formData.append("prediction_type_api", "Boceto3D");

        await uploadPredictionPreview(token, formData);
        console.log("Previsualización subida con éxito para 'Boceto a 3D'.");
      } catch (error) {
        console.error("Error al subir la previsualización:", error);
      }
    },
    [user, prediction_boceto3d_result]
  );

  const isUIBlocked = isSubmitting || (taskId && (taskStatus === "PENDING" || taskStatus === "PROCESSING"));

  const isButtonDisabled =
    isUIBlocked ||
    !generationName.trim() ||
    isCanvasEmpty();

  const showPollingStatus = taskId && (taskStatus === "PENDING" || taskStatus === "PROCESSING");
  const showSuccessUI = taskStatus === "SUCCESS";
  const showFailureUI = taskStatus === "FAILURE" && submissionError;

  const handleStartNewGeneration = () => {
    resetComponentState(true);
  };

  const handleTryAgain = () => {
    resetComponentState(true);
  };

  return (
    <section
      className={`w-full bg-white dark:bg-fondologin text-gray-800 dark:text-white transition-all duration-300 ease-in-out relative flex flex-col h-[calc(100vh-4rem)] ${
        isCollapsed ? "sm:pl-[80px]" : "md:pl-[267px] 2xl:pl-[300px]"
      }`}
    >
      <div className="relative z-10 px-4 sm:px-6 md:px-8 pt-6 pb-8 flex flex-col flex-grow">
        {/* Header */}
        <div className="mb-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-azul-gradient to-morado-gradient">
                {t("generation_pages.sketch_to_3d.title")}
              </h1>
              <div className="h-1 w-24 bg-gradient-to-r from-azul-gradient to-morado-gradient rounded-full mt-1.5"></div>
            </div>
          </div>
        </div>
        <hr className="border-t-2 border-gray-200 dark:border-linea/20 mb-6 flex-shrink-0" />

        {/* Main Content Area */}
        <div className="flex-grow flex flex-col xl:grid xl:grid-cols-5 gap-4">
          {/* Input Column */}
          <div className="xl:col-span-2">
            <div className="bg-gray-50 dark:bg-principal/30 backdrop-blur-sm border border-gray-200 dark:border-linea/20 rounded-2xl p-4 h-full flex flex-col space-y-4">
              {/* Generation Name Input */}
              <div className="flex-shrink-0">
                <div className="flex items-center gap-3 mb-2">
                  <TextAa size={18} className="text-azul-gradient" />
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
                    {t("generation_pages.common.generation_name_label")}
                  </h3>
                </div>
                <input
                  type="text"
                  placeholder={t("generation_pages.common.name_placeholder_generic")}
                  value={generationName}
                  onChange={(e) => setGenerationName(e.target.value)}
                  disabled={isUIBlocked}
                  className={`w-full p-2.5 rounded-lg bg-white dark:bg-principal/50 border-2 text-gray-800 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-azul-gradient/50 focus:border-azul-gradient transition-all duration-300 ${
                    generationName.trim() ? "border-azul-gradient" : "border-gray-300 dark:border-linea/30"
                  }`}
                />
              </div>

              {/* Canvas and Controls */}
              <div className="flex-grow flex flex-col min-h-0">
                <div
                  className={`w-full min-h-[400px] xl:min-h-0 xl:flex-grow rounded-lg overflow-hidden relative border-2 ${
                    isUIBlocked ? "opacity-60 pointer-events-none" : "border-gray-300 dark:border-linea/30"
                  }`}
                  style={{ touchAction: "none" }}
                >
                  <div
                    className="w-full h-full bg-white"
                    style={{ cursor: "crosshair" }}
                    {...drawingHandlers}
                  >
                    <canvas
                      ref={initializeLocalCanvas}
                      width={canvasConfig.width}
                      height={canvasConfig.height}
                      className="w-full h-full block"
                    />
                  </div>
                  {/* Canvas Toolbar */}
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2 bg-gray-100/80 dark:bg-[#1f2437]/80 backdrop-blur-sm p-1.5 rounded-xl border border-gray-200 dark:border-linea/20">
                    {[
                      { tool: "pencil", Icon: PencilSimple, title: t("generation_pages.common.pencil_tooltip") },
                      { tool: "eraser", Icon: Eraser, title: t("generation_pages.common.eraser_tooltip") },
                    ].map(({ tool, Icon, title }) => (
                      <button
                        key={tool}
                        onClick={() => setTool(tool)}
                        disabled={isUIBlocked}
                        className={`p-2 rounded-lg flex items-center justify-center transition-all ${
                          drawingState.tool === tool
                            ? "bg-gradient-to-r from-azul-gradient to-morado-gradient text-white shadow-md"
                            : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20"
                        }`}
                        title={title}
                      >
                        <Icon size={20} weight="bold" />
                      </button>
                    ))}
                    <div className="h-px w-full bg-gray-300 dark:bg-linea/30 my-1" />
                    <button
                      onClick={clearCanvas}
                      disabled={isUIBlocked}
                      className="p-2 rounded-lg flex items-center justify-center transition-all text-gray-600 dark:text-gray-300 hover:bg-red-500/80 hover:text-white"
                      title={t("generation_pages.common.clear_canvas_tooltip")}
                    >
                      <Trash size={20} weight="bold" />
                    </button>
                  </div>
                  {/* Description and Generate Button Bar */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 space-y-2">
                    <div className="bg-white/80 dark:bg-principal/80 backdrop-blur-sm border border-gray-200 dark:border-linea/20 rounded-lg p-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        placeholder={t("generation_pages.common.canvas_description_placeholder")}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={isUIBlocked}
                        className="flex-1 text-sm bg-transparent text-gray-800 dark:text-white border-none focus:ring-0 placeholder-gray-500 dark:placeholder-gray-400 px-1 py-1"
                      />
                      {!showSuccessUI && !showFailureUI && (
                        <button
                          onClick={handleLocalPrediction}
                          disabled={isButtonDisabled}
                          className="text-sm font-semibold bg-gradient-to-r from-azul-gradient to-morado-gradient py-2 px-4 rounded-md border-none flex items-center justify-center gap-2 transition-all hover:scale-105 disabled:opacity-60 disabled:hover:scale-100 whitespace-nowrap text-white"
                        >
                          <Sparkle size={16} weight="fill" />
                          {t("generation_pages.common.canvas_generate_button")}
                        </button>
                      )}
                    </div>
                    {/* Status/Result Display Area */}
                    {showPollingStatus && (
                      <div className="text-center p-2 bg-blue-500/10 dark:bg-blue-400/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                        {t("generation_pages.common.status_generating")} (Status: {taskStatus}) {t("generation_pages.common.please_wait")}
                      </div>
                    )}
                    {showSuccessUI && (
                      <div className="text-center p-3 bg-green-500/10 dark:bg-green-400/20 rounded-lg text-sm text-green-700 dark:text-green-300 space-y-2">
                        <p className="font-semibold">{t("generation_pages.common.status_success_message")}</p>
                        {taskData ? (
                          <>
                            {taskData.generation_name && (
                              <p><strong>{t("generation_pages.common.generation_name_label")}:</strong> {taskData.generation_name}</p>
                            )}
                            {taskData.preview_image_url && (
                              <div className="flex justify-center my-2">
                                <img
                                  src={taskData.preview_image_url}
                                  alt={t("generation_pages.common.preview_alt_text")}
                                  className="max-w-full h-auto max-h-48 rounded-md border border-green-300 dark:border-green-600 shadow-sm"
                                />
                              </div>
                            )}
                            {taskData.model_url ? (
                              <a
                                href={taskData.model_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded my-1 transition-colors duration-150"
                              >
                                {taskData.model_url.startsWith('gs://')
                                  ? t("generation_pages.common.view_model_gs_link")
                                  : t("generation_pages.common.view_3d_model_button")}
                              </a>
                            ) : (
                              <p className="text-xs text-gray-500 dark:text-gray-400">{t("generation_pages.common.model_url_not_found")}</p>
                            )}
                            {taskData.model_url && taskData.model_url.startsWith('gs://') && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">({taskData.model_url})</p>
                            )}
                          </>
                        ) : (
                          <p>{t("generation_pages.common.no_details_available")}</p>
                        )}
                      </div>
                    )}
                    {(showSuccessUI || showFailureUI) && (
                      <button
                        onClick={showSuccessUI ? handleStartNewGeneration : handleTryAgain}
                        className="w-full text-sm font-semibold bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 py-2 px-4 rounded-md border-none flex items-center justify-center gap-2 transition-all text-gray-800 dark:text-white"
                      >
                        {showSuccessUI ? t("generation_pages.common.button_new_generation") : t("generation_pages.common.button_try_again")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Result Column */}
          <div className="xl:col-span-3 flex-grow min-h-[500px] md:min-h-[600px] xl:min-h-0">
            <div className="h-full min-h-[400px] sm:min-h-[500px] md:min-h-[600px] xl:min-h-0 border-2 border-gray-200 dark:border-linea/20 rounded-3xl overflow-hidden">
              <Boceto3DResult onFirstLoad={handlePreviewUpload} />
            </div>
          </div>
        </div>
      </div>
      {/* Modals */}
      <ErrorModal
        showModal={!!submissionError && taskStatus !== "SUCCESS"}
        closeModal={clearSubmissionError}
        errorMessage={submissionError || ""}
      />
      <LoadingModal showLoadingModal={isSubmitting && !taskId} steps={loadingSteps} />
    </section>
  );
};
