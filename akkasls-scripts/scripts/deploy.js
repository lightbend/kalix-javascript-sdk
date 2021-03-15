export function exec({ config, runOrFail }) {
  const { dockerTag, serviceName } = config;

  runOrFail("Pushing docker image", "docker", ["push", dockerTag]);
  runOrFail("Deploying Akka Serverless service", "akkasls", [
    "services",
    "deploy",
    serviceName,
    dockerTag,
  ]);
}
