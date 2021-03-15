export function exec({ config, runOrFail }) {
  const { dockerTag } = config;

  runOrFail("Building docker image", "docker", [
    "build",
    "--tag",
    dockerTag,
    ".",
  ]);
}
