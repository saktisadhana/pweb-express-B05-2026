import { Lane, Role } from "../generated/prisma/enums";
import { parseBody, parseEnum, parseInteger, parsePrice, requiredText } from "./parse";

export const parseHeroInput = (value: unknown) => {
  const body = parseBody(value);
  return {
    name: requiredText(body.name, "name"),
    role: parseEnum(body.role, Role, "role"),
    lane: parseEnum(body.lane, Lane, "lane"),
    releaseYear: parseInteger(body.releaseYear, "releaseYear", 1),
    priceBP: parsePrice(body.priceBP, "priceBP"),
    priceDiamond: parsePrice(body.priceDiamond, "priceDiamond"),
  };
};
