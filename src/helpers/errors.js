"use strict";

const { HttpError } = require("http-errors");

const formatYupErrors = ( yupError ) => {
  console.log( yupError );
};

/* ApplicationError */
class BadRequestError extends Error {
  constructor(message, details = {}) {
    super();
    this.name    = "BadRequestError";
    this.status  = 400;
    this.message = message;
    this.path    = details.path;
    this.key     = details.key;
  }
}

class UnauthorizedError extends BadRequestError {
  constructor(message, details) {
    super(message, details);
    this.status = 401;
  }
}

class ForbiddenError extends BadRequestError {
  constructor(message, details) {
    super(message, details);
    this.status = 403;
  }
}

class NotFoundError extends BadRequestError {
  constructor(message, details) {
    super(message, details);
    this.status = 404;
  }
}

class ConflictError extends BadRequestError {
  constructor(message, details) {
    super(message, details);
    this.status = 409;
  }
}

class UnprocessableContentError extends BadRequestError {
  constructor(message, details) {
    super(message, details);
    this.status = 422;
  }
}

module.exports = {
  HttpError,
  ConflictError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  UnauthorizedError,
  UnprocessableContentError,
};
