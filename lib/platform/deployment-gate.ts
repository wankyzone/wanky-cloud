export function deploymentPipelineUnavailable() {
  return Response.json(
    {
      error: "Deployments are unavailable until the isolated build and runtime pipeline is connected.",
      code: "deployment_pipeline_unavailable",
    },
    { status: 503 },
  );
}
