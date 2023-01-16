import { Context } from "aws-lambda";

// https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-batch/index.html
import { BatchClient, DeregisterJobDefinitionCommand } from "@aws-sdk/client-batch";

export async function handler(event: any, context: Context) {
  console.log(event);

  if (!event.jobDefinitionArn) throw new Error("missing required input: jobDefinitionArn");

  const client = new BatchClient({});
  const batchCommand = new DeregisterJobDefinitionCommand({
    jobDefinition: event.jobDefinitionArn,
  });

  const response = await client.send(batchCommand);
  console.log(response);

  return response;
}
