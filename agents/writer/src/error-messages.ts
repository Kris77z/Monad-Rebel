import { DEFAULT_LANGUAGE_CODE, localizeByLocale, type LanguageCode } from "@rebel/shared";
import { WriterError } from "./errors.js";

export function localizeWriterError(error: WriterError, locale: LanguageCode = DEFAULT_LANGUAGE_CODE): WriterError {
  const message = (() => {
    switch (error.code) {
      case "INTERNAL_ERROR":
        return localizeByLocale(locale, {
          en: "Unexpected writer failure",
          zh: "Writer 出现未预期错误"
        });
      case "INVALID_PAYLOAD":
        return localizeByLocale(locale, {
          en: "The request payload is invalid",
          zh: "请求参数无效"
        });
      case "INVALID_SKILL_OUTPUT":
        return localizeByLocale(locale, {
          en: "The skill returned invalid output",
          zh: "技能返回了无效输出"
        });
      case "SKILL_DIR_MISSING":
        return localizeByLocale(locale, {
          en: "The local service skill directory is missing",
          zh: "本地服务技能目录缺失"
        });
      case "SKILL_NOT_FOUND":
        return localizeByLocale(locale, {
          en: "No valid service skill definition was found",
          zh: "未找到有效的服务技能定义"
        });
      case "UNSUPPORTED_TASK_TYPE":
        return localizeByLocale(locale, {
          en: "The requested task type is not supported",
          zh: "请求的任务类型不受支持"
        });
      case "DUPLICATE_NONCE":
        return localizeByLocale(locale, {
          en: "The payment transaction has already been used",
          zh: "该支付交易已被使用"
        });
      case "SETTLEMENT_FAILED":
        return localizeByLocale(locale, {
          en: "Payment transaction verification failed",
          zh: "支付交易校验失败"
        });
      case "RECIPIENT_MISMATCH":
        return localizeByLocale(locale, {
          en: "The transaction recipient does not match the writer service",
          zh: "交易接收方与 writer 服务不匹配"
        });
      case "INVALID_AMOUNT":
        return localizeByLocale(locale, {
          en: "The transaction amount is lower than the required price",
          zh: "交易金额低于所需价格"
        });
      default:
        return error.message;
    }
  })();

  return new WriterError(error.status, error.code, message, error.details);
}
