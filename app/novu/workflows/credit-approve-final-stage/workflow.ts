import { workflow } from "@novu/framework";
import { z } from "zod";
import { renderEmail } from "../../emails/novu-onboarding-email";
import { emailControlSchema, payloadSchema } from "./schemas";

export const creditApproveFinalStage = workflow(
  "credit-approve-final-stage-workflow",
  async ({ step, payload }) => {
    await step.inApp("In-App-pre-approve", async () => {
      return {
        subject: payload.inAppSubject,
        body: payload.inAppBody,
        avatar: payload.inAppAvatar,
      };
    });


    await step.email(
      "send-email-pre-approve",
      async (controls) => {
        console.log({ controls });
        return {
          subject: controls.subject,
          body: renderEmail(controls, payload),
        };
      },
      {
        controlSchema: emailControlSchema,
      },
    );

    const customResolver = await step.custom(
      "governance-check",
      async () => {
        const shouldSkip = await mockInspectionService(300);

        return {
          shouldSkip,
        };
      },
      {
        outputSchema: z.object({
          shouldSkip: z.boolean(),
        }),
      },
    );

    await step.inApp("In-App Step", async () => {
      return {
        subject: payload.inAppSubject,
        body: payload.inAppBody,
        avatar: payload.inAppAvatar,
      };
    }, {
      skip: () => customResolver.shouldSkip
    });


    await step.email(
      "send-email",
      async (controls) => {
        console.log({ controls });
        return {
          subject: controls.subject,
          body: renderEmail(controls, payload),
        };
      },
      {
        controlSchema: emailControlSchema,
        skip: () => customResolver.shouldSkip
      },
    );

    await step.chat(
      "chat-step",
      async () => {
        return {
          body: "Base Chat Step Content",
        };
      },
      {
        providers: {
          slack: async (step) => {
            return {
              body: "Hello, world!",
              blocks: [
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: "Hello, world!",
                  },
                },
              ],
            };
          },
        },
      },
    );
  },
  {
    payloadSchema,
  },
);

function mockInspectionService(seconds: number): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, seconds * 1000);
  });
}
