import * as cdk from "aws-cdk-lib";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as batch from "@aws-cdk/aws-batch-alpha";

import { Construct } from "constructs";

export class DynamicBatchJobDefinitionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 1,
    });

    const computeEnvironment = new batch.ComputeEnvironment(this, "ComputeEnvironment", {
      computeResources: {
        vpc: vpc,
      },
    });

    const jobQueue = new batch.JobQueue(this, "JobQueue", {
      computeEnvironments: [{ computeEnvironment, order: 1 }],
    });

    const registerJobDefinitionLambda = new nodejs.NodejsFunction(
      this,
      "register-job-definition-lambda",
      {
        initialPolicy: [
          new iam.PolicyStatement({
            actions: ["batch:RegisterJobDefinition"],
            resources: ["*"],
          }),
        ],
      }
    );

    const registerJobDefinition = new tasks.LambdaInvoke(this, "register-job-definition", {
      lambdaFunction: registerJobDefinitionLambda,
      resultPath: "$.jobDefinitionArn",
      payloadResponseOnly: true,
    });

    const runJob = new tasks.BatchSubmitJob(this, "run-job", {
      jobDefinitionArn: sfn.JsonPath.stringAt("$.jobDefinitionArn"),
      jobName: sfn.JsonPath.stringAt("$.name"),
      jobQueueArn: jobQueue.jobQueueArn,
      resultPath: sfn.JsonPath.DISCARD,
    });

    const deregisterJobDefinitionLambda = new nodejs.NodejsFunction(
      this,
      "deregister-job-definition-lambda",
      {
        initialPolicy: [
          new iam.PolicyStatement({
            actions: ["batch:DeregisterJobDefinition"],
            resources: ["*"],
          }),
        ],
      }
    );

    const deregisterJobDefinition = new tasks.LambdaInvoke(this, "deregister-job-definition", {
      lambdaFunction: deregisterJobDefinitionLambda,
      resultPath: sfn.JsonPath.DISCARD,
      payloadResponseOnly: true,
    });

    const definition = sfn.Chain.start(registerJobDefinition)
      .next(runJob)
      .next(deregisterJobDefinition);

    new sfn.StateMachine(this, "StateMachine", {
      definition: definition,
      // timeout: cdk.Duration.minutes(10),
    });
  }
}
