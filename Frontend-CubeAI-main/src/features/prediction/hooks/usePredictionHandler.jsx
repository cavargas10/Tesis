import { useState, useCallback } from "react";
import {
  generateBoceto3D,
  generateImagen3D,
  generateTexto3D,
  generateTextImg3D,
  generateUnico3D,
  generateMultiImagen3D,
  getTaskStatus, // Import the new function
} from "../services/predictionApi";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";

export const usePredictionHandler = (user) => {
  const { t } = useTranslation();

  const [isSubmitting, setIsSubmitting] = useState(false); // Renamed from isLoading
  const [submissionError, setSubmissionError] = useState(null); // Renamed from error
  const [loadingSteps, setLoadingSteps] = useState([]);
  const [taskId, setTaskId] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null); // e.g., PENDING, PROCESSING, SUCCESS, FAILURE
  const [taskData, setTaskData] = useState(null); // To store data from successful/failed task

  const submitPrediction = useCallback(
    async (endpoint, payload) => {
      const translatedSteps = t(`loading_steps.${endpoint}`, { returnObjects: true }) || t('loading_steps.default', { returnObjects: true });
      setLoadingSteps(translatedSteps);

      setIsSubmitting(true);
      setSubmissionError(null); // Clear previous errors

      if (!user) {
        setSubmissionError("Usuario no autenticado. Inicia sesión para continuar.");
        setIsSubmitting(false);
        return null;
      }

      let predictionFunction;
      switch (endpoint) {
        case "boceto3D": predictionFunction = generateBoceto3D; break;
        case "imagen3D": predictionFunction = generateImagen3D; break;
        case "texto3D": predictionFunction = generateTexto3D; break;
        case "textimg3D": predictionFunction = generateTextImg3D; break;
        case "unico3D": predictionFunction = generateUnico3D; break;
        case "multiimagen3D": predictionFunction = generateMultiImagen3D; break;
        default:
          const unknownEndpointError = `Endpoint de predicción desconocido: ${endpoint}`;
          console.error(unknownEndpointError);
      setSubmissionError(unknownEndpointError);
      setIsSubmitting(false);
          return null;
      }
      
      try {
        const token = await user.getIdToken(true);
        const responseData = await predictionFunction(token, payload);

        if (responseData && responseData.task_id) {
          setTaskId(responseData.task_id);
          setTaskStatus("PENDING");
          setTaskData(null); // Clear previous task data
        } else if (!responseData || !responseData.task_id) {
          setTaskStatus(null);
          if (responseData && (responseData.error || responseData.message)) {
            setSubmissionError(responseData.error || responseData.message);
          }
        }
        setIsSubmitting(false);
        return responseData;
      } catch (err) {
        setSubmissionError(err.message || "Ha ocurrido un error inesperado.");
        setTaskId(null);
        setTaskStatus(null);
        setTaskData(null);
        setIsSubmitting(false);
        return null;
      }
    },
    [user, t, setIsSubmitting, setSubmissionError]
  );

  // Polling effect for task status
  useEffect(() => {
    let intervalId;

    const fetchTaskStatus = async () => {
      if (!taskId || !user) return; // Ensure user is available for token fetching

      try {
        const token = await user.getIdToken(true);
        const result = await getTaskStatus(token, taskId);

        // Assuming result directly contains status and potentially other data
        // e.g., result = { status: "SUCCESS", data: {...} } or result = { status: "PROCESSING" }
        if (result && result.status) {
          setTaskStatus(result.status);

          if (result.status === "SUCCESS") {
            setTaskData(result.result !== undefined ? result.result : result.data !== undefined ? result.data : result);
            // Optionally clear submissionError on success if desired:
            // setSubmissionError(null);
          } else if (result.status === "FAILURE") {
            const errorMessage = result.error || result.message || t("errors.task_failed_processing") || "Task failed during processing.";
            setSubmissionError(errorMessage);
            setTaskData(result.result !== undefined ? result.result : {
              error: result.error,
              message: result.message,
              traceback: result.traceback
            });
          } else if (result.status === "PENDING" || result.status === "PROCESSING") {
            // If backend provides intermediate data during PENDING/PROCESSING states
            if (result.data !== undefined) {
              setTaskData(result.data);
            } else if (result.result !== undefined) { // Or if it's in result.result
              setTaskData(result.result);
            }
          }

          if (result.status === "SUCCESS" || result.status === "FAILURE") {
            clearInterval(intervalId);
          }
        } else {
          console.warn("Unexpected status response during polling:", result);
          setSubmissionError(t("errors.unexpected_polling_response") || "Received an unexpected response from the server during polling.");
          // setTaskStatus("FAILURE"); // Consider if this is appropriate, might stop further polls if backend is temporarily unresponsive
        }

      } catch (pollingError) {
        console.error("Polling error:", pollingError);
        setSubmissionError(pollingError.message || t("errors.fetching_task_status") || "Error fetching task status.");
        setTaskStatus("FAILURE");
        setTaskData(null); // Clear task data on polling error
        clearInterval(intervalId);
      }
    };

    if (taskId && user && (taskStatus === "PENDING" || taskStatus === "PROCESSING")) {
      intervalId = setInterval(fetchTaskStatus, 5000); // Poll every 5 seconds
    }

    return () => {
      clearInterval(intervalId);
    };
  }, [taskId, taskStatus, user, setSubmissionError, t]); // setError -> setSubmissionError

  const clearSubmissionError = useCallback(() => { // Renamed from clearError
    setSubmissionError(null);
  }, [setSubmissionError]); // setError -> setSubmissionError

  const resetTaskState = useCallback(() => {
    setTaskId(null);
    setTaskStatus(null);
    setTaskData(null);
    setSubmissionError(null); // setError -> setSubmissionError
    // setLoadingSteps([]); // Optionally clear loading steps too if desired
  }, [setSubmissionError]);

  return {
    isSubmitting, // Renamed
    submissionError, // Renamed
    loadingSteps, 
    submitPrediction,
    clearSubmissionError, // Renamed
    setSubmissionError, // Exposed for external use
    taskId,
    taskStatus,
    taskData,
    resetTaskState, // Added
  };
};