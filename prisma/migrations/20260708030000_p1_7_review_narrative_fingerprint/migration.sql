-- Add a nullable fingerprint for detecting custom narratives whose calculation source has changed.
ALTER TABLE "AnalysisModule" ADD COLUMN "customNarrativeSourceFingerprint" TEXT;
