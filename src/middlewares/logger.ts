import type { RequestHandler } from "express";

export const logger: RequestHandler = (req, res, next) => {
  const path = req.path;
  const start = Date.now();
  res.once("finish", () => {
    console.log(`${req.method} ${path} ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
};
