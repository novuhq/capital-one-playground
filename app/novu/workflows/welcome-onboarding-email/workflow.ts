import { workflow } from "@novu/framework";
import { z } from "zod";
import { renderEmail } from "../../emails/novu-onboarding-email";
import { emailControlSchema, payloadSchema } from "./schemas";

export const welcomeOnboardingEmail = workflow(
  "onboarding-workflow",
  async ({ step, payload }) => {
    const customResolver = await step.custom(
      "custom-resolver",
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
        skip: async () => {
          const shouldContinue = await mockInspectionService(300);

          return !shouldContinue;
        },
      },
    );

    await step.inApp("In-App Step", async () => {
      return {
        subject: payload.inAppSubject,
        body: payload.inAppBody,
        avatar: payload.inAppAvatar,
      };
    });

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
