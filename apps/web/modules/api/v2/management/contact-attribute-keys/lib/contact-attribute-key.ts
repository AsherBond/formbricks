import { getContactAttributeKeysQuery } from "@/modules/api/v2/management/contact-attribute-keys/lib/utils";
import {
  TContactAttributeKeyInput,
  TGetContactAttributeKeysFilter,
} from "@/modules/api/v2/management/contact-attribute-keys/types/contact-attribute-keys";
import { ApiErrorResponseV2 } from "@/modules/api/v2/types/api-error";
import { ContactAttributeKey, Prisma } from "@prisma/client";
import { cache as reactCache } from "react";
import { prisma } from "@formbricks/database";
import { PrismaErrorType } from "@formbricks/database/types/error";
import { Result, err, ok } from "@formbricks/types/error-handlers";

export const getContactAttributeKeys = reactCache(
  async (environmentIds: string[], params: TGetContactAttributeKeysFilter) => {
    try {
      const query = getContactAttributeKeysQuery(environmentIds, params);

      const [keys, count] = await prisma.$transaction([
        prisma.contactAttributeKey.findMany({
          ...query,
        }),
        prisma.contactAttributeKey.count({
          where: query.where,
        }),
      ]);

      return ok({ data: keys, meta: { total: count, limit: params.limit, offset: params.skip } });
    } catch (error) {
      return err({
        type: "internal_server_error",
        details: [{ field: "contactAttributeKeys", issue: error.message }],
      });
    }
  }
);

export const createContactAttributeKey = async (
  contactAttributeKey: TContactAttributeKeyInput
): Promise<Result<ContactAttributeKey, ApiErrorResponseV2>> => {
  const { environmentId, name, description, key } = contactAttributeKey;

  try {
    const prismaData: Prisma.ContactAttributeKeyCreateInput = {
      environment: {
        connect: {
          id: environmentId,
        },
      },
      name,
      description,
      key,
    };

    const createdContactAttributeKey = await prisma.contactAttributeKey.create({
      data: prismaData,
    });

    return ok(createdContactAttributeKey);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (
        error.code === PrismaErrorType.RecordDoesNotExist ||
        error.code === PrismaErrorType.RelatedRecordDoesNotExist
      ) {
        return err({
          type: "not_found",
          details: [{ field: "contactAttributeKey", issue: "not found" }],
        });
      }
      if (error.code === PrismaErrorType.UniqueConstraintViolation) {
        return err({
          type: "conflict",
          details: [
            {
              field: "contactAttributeKey",
              issue: `Contact attribute key with "${contactAttributeKey.key}" already exists`,
            },
          ],
        });
      }
    }
    return err({
      type: "internal_server_error",
      details: [{ field: "contactAttributeKey", issue: error.message }],
    });
  }
};
