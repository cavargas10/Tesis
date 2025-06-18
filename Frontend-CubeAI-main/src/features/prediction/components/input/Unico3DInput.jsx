import { useState, useEffect, useCallback } from "react";
import { Sparkle, UploadSimple, TextAa } from "@phosphor-icons/react";
import { ErrorModal } from "../../../../components/modals/ErrorModal";
import { LoadingModal } from "../../../../components/modals/LoadingModal";
import { Unico3DResult } from "../results/Unico3DResult";
import { usePredictionHandler } from "../../hooks/usePredictionHandler";
import { useImageUpload } from "../../hooks/useImageUpload";
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

export const Unico3DInput = ({ isCollapsed }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { dispatch, clearResult, prediction_unico3d_result } = usePredictions();
  const [generationName, setGenerationName] = useState("");

  const {
    imageFile,
    imagePreview,
    isDragging,
    handleFileChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    resetImageState,
  } = useImageUpload();

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

  const resetComponentState = useCallback((clearTask = false) => {
    setGenerationName("");
    resetImageState();
    clearSubmissionError();
    clearResult("unico3d");
    if (clearTask) {
      resetTaskState();
    }
  }, [resetImageState, clearSubmissionError, clearResult, resetTaskState]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      resetComponentState(true);
    };
  }, [resetComponentState]);

  // Effect to handle updates from task polling
  useEffect(() => {
    if (taskStatus === "SUCCESS" && taskData) {
      dispatch({ type: 'SET_PREDICTION', payload: { type: 'unico3d', result: taskData } });
      clearSubmissionError();
    } else if (taskStatus === "FAILURE") {
      clearResult('unico3d');
    }
  }, [taskStatus, taskData, dispatch, clearResult, clearSubmissionError]);

  const handleLocalPrediction = async () => {
    if (!generationName.trim()) {
      setSubmissionError(t("generation_pages.common.error_name_required") || "Por favor, ingrese un nombre para la generación");
      return;
    }
    if (!imageFile) {
      setSubmissionError(t("generation_pages.common.error_no_image_selected") || "No se ha seleccionado ninguna imagen");
      return;
    }

    resetComponentState(true); // Clear previous states and task

    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("generationName", generationName);

    await submitPrediction("unico3D", formData);
    // Result dispatching is handled by the useEffect listening to taskStatus and taskData
  };

  const handlePreviewUpload = useCallback(
    async (dataURL) => {
      if (
        !user ||
        !prediction_unico3d_result ||
        !prediction_unico3d_result.generation_name
      )
        return;
      if (prediction_unico3d_result.previewImageUrl) return;

      try {
        const token = await user.getIdToken();
        const previewBlob = dataURLtoBlob(dataURL);

        const formData = new FormData();
        formData.append("preview", previewBlob, "preview.png");
        formData.append(
          "generation_name",
          prediction_unico3d_result.generation_name
        );
        formData.append("prediction_type_api", "Unico3D");

        await uploadPredictionPreview(token, formData);
        console.log("Previsualización subida con éxito para 'Único a 3D'.");
      } catch (error) {
        console.error("Error al subir la previsualización:", error);
      }
    },
    [user, prediction_unico3d_result]
  );

  const isUIBlocked = isSubmitting || (taskId && (taskStatus === "PENDING" || taskStatus === "PROCESSING"));

  const isButtonDisabled =
    isUIBlocked ||
    !generationName.trim() ||
    !imageFile;

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
      className={`w-full bg-white dark:bg-fondologin text-gray-800 dark:text-white transition-all duration-300 ease-in-out relative flex flex-col min-h-[calc(100vh-4rem)] ${
        isCollapsed ? "sm:pl-[80px]" : "md:pl-[267px] 2xl:pl-[300px]"
      }`}
    >
      <div className="relative z-10 px-4 sm:px-6 md:px-8 pt-6 pb-8 flex flex-col flex-grow">
        {/* Header */}
        <div className="mb-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-azul-gradient to-morado-gradient">
                {t("generation_pages.unique_to_3d.title")}
              </h1>
              <div className="h-1 w-24 bg-gradient-to-r from-azul-gradient to-morado-gradient rounded-full mt-1.5"></div>
            </div>
          </div>
        </div>

        <hr className="border-t-2 border-gray-200 dark:border-linea/20 mb-6 flex-shrink-0" />

        <div className="flex-grow flex flex-col xl:grid xl:grid-cols-5 xl:gap-4">
          <div className="xl:col-span-2 mb-6 xl:mb-0">
            <div className="bg-gray-50 dark:bg-principal/30 backdrop-blur-sm border border-gray-200 dark:border-linea/20 rounded-2xl p-4 h-full flex flex-col space-y-4">
              <div>
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

              {/* Image Upload Area */}
              <div className="flex-grow flex flex-col min-h-0">
                <div className="flex items-center gap-3 mb-2">
                  <UploadSimple size={18} className="text-azul-gradient" />
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
                    {t("generation_pages.common.upload_image_label")}
                  </h3>
                </div>
                <div
                  className={`relative border-2 border-dashed rounded-lg p-2 text-center cursor-pointer transition-colors flex flex-col items-center justify-center flex-grow 
                  ${isDragging ? "border-azul-gradient bg-azul-gradient/5" : imagePreview ? "border-azul-gradient bg-azul-gradient/5" : "border-gray-300 dark:border-linea/30"}
                  ${isUIBlocked ? "opacity-50 cursor-not-allowed" : "hover:border-azul-gradient/50"}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={isUIBlocked ? undefined : handleDrop}
                  onClick={() => !isUIBlocked && document.getElementById("fileInput-unico3d").click()}
                >
                  <input
                    id="fileInput-unico3d"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isUIBlocked}
                    className="hidden"
                  />
                  {imagePreview ? (
                    <div className="w-full h-full relative min-h-[200px] sm:min-h-[220px] xl:min-h-0">
                      <img src={imagePreview} alt="Vista previa" className="absolute inset-0 w-full h-full object-contain rounded-lg" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 min-h-[200px] sm:min-h-[220px] xl:min-h-0">
                      <UploadSimple className="w-10 h-10 text-gray-400 mb-3" weight="light" />
                      <p className="text-sm text-gray-500 dark:text-gray-300">{t("generation_pages.common.drag_and_drop_prompt")}</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">{t("generation_pages.common.file_types")}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Generate Button and Status Display Area */}
              <div className="mt-auto flex-shrink-0 space-y-2">
                {!showSuccessUI && !showFailureUI && (
                  <button
                    onClick={handleLocalPrediction}
                    disabled={isButtonDisabled}
                    className="w-full text-base font-semibold bg-gradient-to-r from-azul-gradient to-morado-gradient py-3 rounded-lg border-none flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-lg hover:shadow-morado-gradient/20 hover:scale-105 disabled:opacity-60 disabled:hover:scale-100 disabled:cursor-not-allowed text-white"
                  >
                    <Sparkle size={22} weight="fill" />
                    {t("generation_pages.common.generate_button")}
                  </button>
                )}
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
                    className="w-full text-base font-semibold bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 py-2.5 rounded-lg border-none flex items-center justify-center gap-2 transition-all duration-300 text-gray-800 dark:text-white"
                  >
                    {showSuccessUI ? t("generation_pages.common.button_new_generation") : t("generation_pages.common.button_try_again")}
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* Result Column */}
          <div className="xl:col-span-3 flex-grow">
            <div className="h-full min-h-[400px] sm:min-h-[500px] md:min-h-[600px] xl:min-h-0 border-2 border-gray-200 dark:border-linea/20 rounded-3xl overflow-hidden">
              <Unico3DResult onFirstLoad={handlePreviewUpload} />
            </div>
          </div>
        </div>
      </div>

      <ErrorModal
        showModal={!!submissionError && taskStatus !== "SUCCESS"}
        closeModal={clearSubmissionError}
        errorMessage={submissionError || ""}
      />
      <LoadingModal showLoadingModal={isSubmitting && !taskId} steps={loadingSteps} />
    </section>
  );
};
