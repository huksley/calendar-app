/*
# Pull request opened
# GITHUB_EVENT_NAME='pull_request'
# GITHUB_BASE_REF='master'
# GITHUB_HEAD_REF='github-deploy'

# Push
# GITHUB_EVENT_NAME='push'
# GITHUB_BASE_REF=''
# GITHUB_HEAD_REF=''
# GITHUB_REF='refs/heads/github-deploy'
*/

if (process.env.GITHUB_EVENT_NAME === "push") {
  let branch = process.env.GITHUB_REF;
  branch = branch.replace("refs/heads/", "");
  branch = branch.replace(/[^a-zA-Z0-9-]+/g, "-");
  console.log(`::set-output name=slug::${branch}`);
} else if (process.env.GITHUB_EVENT_NAME === "pull_request") {
  let branch = process.env.GITHUB_HEAD_REF;
  branch = branch.replace(/[^a-zA-Z0-9-]+/g, "-");
  console.log(`::set-output name=slug::${branch}`);
} else {
  console.log("Unknown GitHub event", process.env.GITHUB_EVENT_NAME);
  process.exit(1);
}
