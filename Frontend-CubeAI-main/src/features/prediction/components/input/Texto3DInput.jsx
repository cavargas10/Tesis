import { useState, useEffect, useCallback } from "react";
import { Sparkle, TextAa, TextT, PaintBrush } from "@phosphor-icons/react";
import { ErrorModal } from "../../../../components/modals/ErrorModal";
import { LoadingModal } from "../../../../components/modals/LoadingModal";
import { Texto3DResult } from "../results/Texto3DResult";
import { usePredictionHandler } from "../../hooks/usePredictionHandler";
import { useAuth } from "../../../auth/hooks/useAuth";
import { usePredictions } from "../../context/PredictionContext";
import { uploadPredictionPreview } from "../../services/predictionApi";
import { useTranslation } from "react-i18next";

function dataURLtoBlob(dataurl) {
    const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
}

export const Texto3DInput = ({ isCollapsed }) => {
  const { t } = useTranslation();

  const { user } = useAuth();
  const { dispatch, clearResult, prediction_text3d_result } = usePredictions();
  const [generationName, setGenerationName] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState(null);
  const styles = [
    { name: t("generation_pages.styles.disney"), value: "disney" },
    { name: t("generation_pages.styles.pixar"), value: "pixar" },
    { name: t("generation_pages.styles.realistic"), value: "realistic" },
    { name: t("generation_pages.styles.anime"), value: "anime" },
    { name: t("generation_pages.styles.chibi"), value: "chibi" },
  ];

  const {
    isLoading: predictionLoading,
    error: predictionError,
    loadingSteps,
    submitPrediction,
    clearError: clearPredictionError,
    setError: setPredictionError,
  const {
    isLoading: isSubmitting, // Renamed for clarity: initial submission loading
    error: submissionError, // Renamed for clarity: error from initial submission
    loadingSteps,
    submitPrediction,
    clearError: clearSubmissionError, // Renamed
    setError: setSubmissionError,   // Renamed
    taskId,
    taskStatus,
    taskData,
    resetTaskState,
  } = usePredictionHandler(user);

  const resetComponentState = useCallback((clearTask = false) => {
    setGenerationName("");
    setUserPrompt("");
    setSelectedStyle(null);
    clearSubmissionError();
    clearResult('text3d');
    if (clearTask) {
      resetTaskState();
    }
  }, [clearSubmissionError, clearResult, resetTaskState]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      resetComponentState(true); // Clear everything including task state
    };
  }, [resetComponentState]);

  // Effect to handle updates from task polling
  useEffect(() => {
    if (taskStatus === "SUCCESS" && taskData) {
      // Assuming taskData is the complete prediction result object expected by the context
      // The backend for /generation_status/<task_id> should return { status: "SUCCESS", result: { ...prediction_data... } }
      // And usePredictionHandler stores this `result` object (the content of the `result` field) into `taskData`.
      // Let's adjust based on what usePredictionHandler actually stores in taskData.
      // The hook stores `result.data` into `taskData`. If `result.data` from API is `{ actual_prediction_payload }`, then this is fine.
      // If `result.data` is `{ status: "SUCCESS", result: { actual_prediction_payload } }`, then we need `taskData.result`.
      // Based on current usePredictionHandler: `if(result.data) setTaskData(result.data);`
      // And prompt: "taskResult.result", let's assume taskData *is* the result field.
      // This means getTaskStatus in predictionApi.jsx should return response.data.result if the actual payload is nested.
      // For now, let's assume taskData IS the object that needs to be dispatched.
      // This might need adjustment if the structure is different.
      // If `taskData` directly contains { generationName, url, ... }, this is correct:
      dispatch({ type: 'SET_PREDICTION', payload: { type: 'text3d', result: taskData } });
      clearSubmissionError(); // Clear any previous errors
    } else if (taskStatus === "FAILURE") {
      // Error is already set by usePredictionHandler's polling logic.
      // We might want to clear any displayed result in the context if a poll fails.
      clearResult('text3d');
    }
  }, [taskStatus, taskData, dispatch, clearResult, clearSubmissionError]);


  const handleLocalPrediction = async () => {
    if (!generationName.trim() || !userPrompt.trim() || !selectedStyle) {
      setSubmissionError(t("generation_pages.common.error_all_fields_required"));
      return;
    }
    // Clear previous results and errors before starting a new prediction
    resetComponentState(true); // true to also reset task states
    
    // No need to dispatch null here, submitPrediction will lead to task status changes
    // dispatch({ type: 'SET_PREDICTION', payload: { type: 'text3d', result: null } });

    // submitPrediction now handles setting isLoading (isSubmitting) and error (submissionError)
    // It also sets up taskId and taskStatus for polling.
    await submitPrediction("texto3D", {
      generationNameFromInput: generationName, // Pass input name explicitly if needed by backend
      prompt: userPrompt,
      selectedStyle,
      // The backend's initial /texto3D response should include generationName if it's created there
      // For now, assuming the hook or subsequent status calls will provide it if needed by taskData.
    });
    // No need to dispatch result here, polling effect will handle it.
  };

  const handlePreviewUpload = useCallback(async (dataURL) => {
    if (!user || !prediction_text3d_result || !prediction_text3d_result.generation_name) return;
    if (prediction_text3d_result.previewImageUrl) return;

    try {
        const token = await user.getIdToken();
        const previewBlob = dataURLtoBlob(dataURL);
        const formData = new FormData();
        formData.append('preview', previewBlob, 'preview.png');
        formData.append('generation_name', prediction_text3d_result.generation_name);
        formData.append('prediction_type_api', 'Texto3D');

        await uploadPredictionPreview(token, formData);
        console.log("Previsualización subida con éxito para 'Texto a 3D'.");
        
    } catch (error) {
        console.error("Error al subir la previsualización:", error);
    }
  }, [user, prediction_text3d_result]);

  const isGenerateButtonDisabled =
    isSubmitting ||
    (taskId && (taskStatus === "PENDING" || taskStatus === "PROCESSING")) ||
    !generationName.trim() ||
    !userPrompt.trim() ||
    !selectedStyle;

  const showPollingStatus = taskId && (taskStatus === "PENDING" || taskStatus === "PROCESSING");
  const showSuccessUI = taskStatus === "SUCCESS";
  const showFailureUI = taskStatus === "FAILURE" && submissionError; // submissionError will contain the error message

  const handleStartNewGeneration = () => {
    resetComponentState(true); // true to reset task state as well
  };

  const handleTryAgain = () => {
    // Reset component state and task state to allow a fresh submission
    resetComponentState(true);
  };

  return (
    <section
      className={`w-full bg-white dark:bg-fondologin text-gray-800 dark:text-white transition-all duration-300 ease-in-out relative flex flex-col h-[calc(100vh-4rem)] ${
        isCollapsed ? "sm:pl-[80px]" : "md:pl-[267px] 2xl:pl-[300px]"
      }`}
    >
      <div className="relative z-10 px-4 sm:px-6 md:px-8 pt-6 pb-8 flex flex-col flex-grow">
        <div className="mb-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-azul-gradient to-morado-gradient">
                {t("generation_pages.text_to_3d.title")}
              </h1>
              <div className="h-1 w-24 bg-gradient-to-r from-azul-gradient to-morado-gradient rounded-full mt-1.5"></div>
            </div>
          </div>
        </div>

        <hr className="border-t-2 border-gray-200 dark:border-linea/20 mb-6 flex-shrink-0" />

        <div className="flex-grow flex flex-col xl:grid xl:grid-cols-5 gap-4">
          {/* --- Columna de Inputs --- */}
          <div className="xl:col-span-2 flex-shrink-0">
            <div className="bg-gray-50 dark:bg-principal/30 backdrop-blur-sm border border-gray-200 dark:border-linea/20 rounded-2xl p-3 h-full flex flex-col space-y-2">
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
                  disabled={isSubmitting || !!taskId} // Disable if submitting or task is active
                  className={`w-full p-2 rounded-lg bg-white dark:bg-principal/50 border-2 text-gray-800 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-azul-gradient/50 focus:border-azul-gradient transition-all duration-300 ${
                    generationName.trim()
                      ? "border-azul-gradient"
                      : "border-gray-300 dark:border-linea/30"
                  }`}
                />
              </div>

              <div className="flex-grow flex flex-col">
                <div className="flex items-center gap-3 mb-2">
                  <TextT size={18} className="text-azul-gradient" />
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
                    {t("generation_pages.common.prompt_label")}
                  </h3>
                </div>
                <textarea
                  placeholder={t("generation_pages.common.prompt_placeholder_generic")}
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  disabled={isSubmitting || !!taskId} // Disable if submitting or task is active
                  className={`w-full p-2 rounded-lg bg-white dark:bg-principal/50 border-2 text-gray-800 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-azul-gradient/50 focus:border-azul-gradient transition-all duration-300 min-h-[80px] flex-grow resize-none ${
                    userPrompt.trim()
                      ? "border-azul-gradient"
                      : "border-gray-300 dark:border-linea/30"
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center gap-3 mb-2">
                  <PaintBrush size={18} className="text-azul-gradient" />
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
                    {t("generation_pages.common.style_label")}
                  </h3>
                </div>
                {/* --- Botones de Estilo --- */}
                <div className="grid grid-cols-3 gap-2">
                  {styles.slice(0, 3).map((style) => (
                    <button
                      key={style.value}
                      onClick={() => setSelectedStyle(style.value)}
                      disabled={isSubmitting || !!taskId} // Disable if submitting or task is active
                      className={`border-2 rounded-lg py-2 px-2 flex items-center justify-center transition-all text-xs h-10 ${
                        selectedStyle === style.value
                          ? "border-azul-gradient bg-azul-gradient/10 dark:bg-azul-gradient/20 shadow-md scale-105 font-semibold ring-2 ring-azul-gradient/50 text-gray-800 dark:text-white"
                          : "border-gray-300 dark:border-linea/30 hover:border-azul-gradient/50 bg-white dark:bg-principal/50 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      <span>{style.name}</span>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {styles.slice(3).map((style) => (
                    <button
                      key={style.value}
                      onClick={() => setSelectedStyle(style.value)}
                      disabled={isSubmitting || !!taskId} // Disable if submitting or task is active
                      className={`border-2 rounded-lg py-2 px-2 flex items-center justify-center transition-all text-xs h-10 ${
                        selectedStyle === style.value
                          ? "border-azul-gradient bg-azul-gradient/10 dark:bg-azul-gradient/20 shadow-md scale-105 font-semibold ring-2 ring-azul-gradient/50 text-gray-800 dark:text-white"
                          : "border-gray-300 dark:border-linea/30 hover:border-azul-gradient/50 bg-white dark:bg-principal/50 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      <span>{style.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button and Status Display Area */}
              <div className="mt-auto flex-shrink-0 space-y-2">
                {!showSuccessUI && !showFailureUI && (
                  <button
                    onClick={handleLocalPrediction}
                    disabled={isGenerateButtonDisabled}
                    className="w-full text-base font-semibold bg-gradient-to-r from-azul-gradient to-morado-gradient py-2.5 rounded-lg border-none flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-lg hover:shadow-morado-gradient/20 hover:scale-105 disabled:opacity-60 disabled:hover:scale-100 disabled:cursor-not-allowed text-white"
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
                 {/* Error for task failure is handled by ErrorModal via submissionError state */}

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
          {/* --- Columna del Resultado --- */}
          <div className="xl:col-span-3 flex-grow min-h-0">
            <div className="h-full min-h-[400px] sm:min-h-[500px] md:min-h-[600px] xl:min-h-0 border-2 border-gray-200 dark:border-linea/20 rounded-3xl overflow-hidden">
              {/* Texto3DResult will display based on prediction_text3d_result from context, which is updated by the useEffect */}
              <Texto3DResult onFirstLoad={handlePreviewUpload} />
            </div>
          </div>
        </div>
      </div>

      <ErrorModal
        showModal={!!submissionError && taskStatus !== "SUCCESS"} // Show if there's an error and task isn't successful
        closeModal={clearSubmissionError} // Or handleTryAgain if it should also clear errors
        errorMessage={submissionError || ""}
      />
      <LoadingModal
        showLoadingModal={isSubmitting && !taskId} // Only show for initial submit before taskId is known
        steps={loadingSteps}
      />
    </section>
  );
};