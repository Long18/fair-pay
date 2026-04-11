export type MoneyExpressionStatus = "empty" | "incomplete" | "invalid" | "valid";

export interface ParseMoneyExpressionResult {
  status: MoneyExpressionStatus;
  value?: number;
  normalized?: string;
  reason?: string;
}

const GROUPED_THOUSANDS_REGEX = /^\d{1,3}(\.\d{3})+$/;
const INTEGER_REGEX = /^\d+$/;
const DECIMAL_REGEX = /^\d+\.\d+$/;
const ALLOWED_CHARACTERS_REGEX = /^[\d+\-*/.xX×\s]+$/;
const EXPRESSION_OPERATOR_REGEX = /[+\-*/xX×]/;

function roundMoneyValue(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isOperator(token: string): boolean {
  return token === "+" || token === "-" || token === "*" || token === "/";
}

function normalizeExpression(raw: string): string {
  return raw.replace(/[xX×]/g, "*").replace(/\s+/g, "");
}

function parseNumericToken(token: string): ParseMoneyExpressionResult {
  const isNegative = token.startsWith("-");
  const normalizedToken = isNegative ? token.slice(1) : token;

  if (!normalizedToken) {
    return { status: "incomplete", normalized: token };
  }

  if (normalizedToken.endsWith(".")) {
    const withoutTrailingDot = normalizedToken.slice(0, -1);
    if (INTEGER_REGEX.test(withoutTrailingDot)) {
      return { status: "incomplete", normalized: token };
    }
  }

  if (GROUPED_THOUSANDS_REGEX.test(normalizedToken)) {
    const value = Number(normalizedToken.replace(/\./g, ""));
    return {
      status: "valid",
      value: isNegative ? -value : value,
      normalized: token,
    };
  }

  if (INTEGER_REGEX.test(normalizedToken) || DECIMAL_REGEX.test(normalizedToken)) {
    const value = Number(normalizedToken);
    return {
      status: Number.isFinite(value) ? "valid" : "invalid",
      value: Number.isFinite(value) ? (isNegative ? -value : value) : undefined,
      normalized: token,
      reason: Number.isFinite(value) ? undefined : "invalid-number",
    };
  }

  return {
    status: "invalid",
    normalized: token,
    reason: "invalid-number",
  };
}

function tokenizeExpression(expression: string): ParseMoneyExpressionResult & { tokens?: string[] } {
  const tokens: string[] = [];
  let currentToken = "";

  for (let index = 0; index < expression.length; index += 1) {
    const char = expression[index];

    if (/\d|\./.test(char)) {
      currentToken += char;
      continue;
    }

    if (char === "-" && currentToken === "" && (tokens.length === 0 || isOperator(tokens[tokens.length - 1]))) {
      currentToken = "-";
      continue;
    }

    if (isOperator(char)) {
      if (currentToken === "" || currentToken === "-") {
        return {
          status: tokens.length > 0 ? "invalid" : "incomplete",
          normalized: expression,
          reason: "unexpected-operator",
        };
      }

      tokens.push(currentToken, char);
      currentToken = "";
      continue;
    }

    return {
      status: "invalid",
      normalized: expression,
      reason: "invalid-character",
    };
  }

  if (currentToken === "") {
    if (tokens.length > 0 && isOperator(tokens[tokens.length - 1])) {
      return {
        status: "incomplete",
        normalized: expression,
        reason: "trailing-operator",
      };
    }

    return {
      status: "empty",
      normalized: expression,
    };
  }

  if (currentToken === "-") {
    return {
      status: "incomplete",
      normalized: expression,
      reason: "dangling-sign",
    };
  }

  tokens.push(currentToken);

  return {
    status: "valid",
    normalized: expression,
    tokens,
  };
}

function evaluateExpression(numbers: number[], operators: string[]): ParseMoneyExpressionResult {
  if (numbers.length === 0) {
    return { status: "empty" };
  }

  const reducedNumbers = [numbers[0]];
  const reducedOperators: string[] = [];

  for (let index = 0; index < operators.length; index += 1) {
    const operator = operators[index];
    const nextNumber = numbers[index + 1];

    if (operator === "*" || operator === "/") {
      const currentNumber = reducedNumbers.pop() ?? 0;

      if (operator === "/" && nextNumber === 0) {
        return {
          status: "invalid",
          reason: "division-by-zero",
        };
      }

      const intermediate = operator === "*"
        ? currentNumber * nextNumber
        : currentNumber / nextNumber;

      reducedNumbers.push(roundMoneyValue(intermediate));
      continue;
    }

    reducedOperators.push(operator);
    reducedNumbers.push(nextNumber);
  }

  let result = reducedNumbers[0];

  for (let index = 0; index < reducedOperators.length; index += 1) {
    const operator = reducedOperators[index];
    const nextNumber = reducedNumbers[index + 1];

    result = operator === "+"
      ? result + nextNumber
      : result - nextNumber;
  }

  const roundedResult = roundMoneyValue(result);

  return {
    status: Number.isFinite(roundedResult) ? "valid" : "invalid",
    value: Number.isFinite(roundedResult) ? roundedResult : undefined,
    reason: Number.isFinite(roundedResult) ? undefined : "invalid-result",
  };
}

export function hasMoneyExpressionOperator(raw: string): boolean {
  return EXPRESSION_OPERATOR_REGEX.test(raw);
}

export function parseMoneyExpression(raw: string): ParseMoneyExpressionResult {
  if (!raw.trim()) {
    return { status: "empty", normalized: "" };
  }

  if (!ALLOWED_CHARACTERS_REGEX.test(raw)) {
    return {
      status: "invalid",
      normalized: raw,
      reason: "invalid-character",
    };
  }

  const normalized = normalizeExpression(raw);
  const tokenized = tokenizeExpression(normalized);

  if (tokenized.status !== "valid" || !tokenized.tokens) {
    return tokenized;
  }

  const numbers: number[] = [];
  const operators: string[] = [];

  for (const token of tokenized.tokens) {
    if (isOperator(token)) {
      operators.push(token);
      continue;
    }

    const numeric = parseNumericToken(token);
    if (numeric.status !== "valid" || numeric.value === undefined) {
      return {
        ...numeric,
        normalized,
      };
    }

    numbers.push(numeric.value);
  }

  const evaluated = evaluateExpression(numbers, operators);
  return {
    ...evaluated,
    normalized,
  };
}
