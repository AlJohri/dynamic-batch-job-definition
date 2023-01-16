import { Context } from "aws-lambda";
import { ulid } from "ulid";

import { BatchClient, RegisterJobDefinitionCommand } from "@aws-sdk/client-batch";

export async function handler(event: any, context: Context) {
  console.log(event);

  if (!event.name) throw new Error("missing required input: name");
  if (!event.image) throw new Error("missing required input: image");
  if (!event.vCPUs) throw new Error("missing required input: vCPUs");
  if (!event.memoryMiB) throw new Error("missing required input: memoryMiB");

  const jobDefinitionName = [event.name, ulid()].join("-");

  const client = new BatchClient({});
  const batchCommand = new RegisterJobDefinitionCommand({
    jobDefinitionName: jobDefinitionName,
    type: "container",
    containerProperties: {
      image: event.image,
      resourceRequirements: [
        { type: "VCPU", value: event.vCPUs.toString() },
        { type: "MEMORY", value: event.memoryMiB.toString() },
      ],
    },
  });

  const response = await client.send(batchCommand);
  console.log(response);

  return response.jobDefinitionArn;
}
