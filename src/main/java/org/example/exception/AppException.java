package org.example.exception;

import org.springframework.http.HttpStatus;

/**
 * Domain exception that carries an HTTP status code.
 * Use this instead of plain RuntimeException so the handler returns
 * the correct status (404, 409, 403 …) rather than always 400.
 */
public class AppException extends RuntimeException {

    private final HttpStatus status;

    public AppException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
