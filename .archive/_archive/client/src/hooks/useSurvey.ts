import { useState, useEffect } from "react";
import api from "@/lib/api";

type SurveyType = "PRESEASON_RANKING" | "WEEKLY_PICKS" | "LEADERBOARD" | "PROFILE" | "BETA_FEEDBACK";

export function useSurvey(surveyType: SurveyType) {
  const [shouldShow, setShouldShow] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkIfAlreadySubmitted();
  }, [surveyType]);

  const checkIfAlreadySubmitted = async () => {
    try {
      const response = await api.get(`/api/feedback/check/${surveyType}`);
      setShouldShow(!response.data.hasSubmitted);
    } catch (error) {
      console.error("Error checking survey status:", error);
      setShouldShow(false);
    } finally {
      setIsChecking(false);
    }
  };

  const trigger = () => {
    if (!isChecking && shouldShow) {
      setShouldShow(true);
    }
  };

  const close = () => {
    setShouldShow(false);
  };

  const markAsSubmitted = () => {
    setShouldShow(false);
  };

  return {
    shouldShow,
    isChecking,
    trigger,
    close,
    markAsSubmitted,
    setShouldShow
  };
}
