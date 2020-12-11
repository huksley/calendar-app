const fs = require("fs");

if (fs.existsSync(".serverless/stack-output/outputs.yml")) {
  const outputs = require("serverless-plugin-test-helper");
  const URL = outputs.getApiGatewayUrl();

  const domain = outputs.getOutput("DomainName");
  if (domain !== undefined) {
    console.log(`::set-output name=url::https://${domain}/`);
  } else {
    console.log(`::set-output name=url::${URL}`);
  }
}
