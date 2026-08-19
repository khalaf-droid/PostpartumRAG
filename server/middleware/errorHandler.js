export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  if (err.name === 'JsonWebTokenError') {
    error.statusCode = 401;
    error.message = 'Invalid token. Please log in again!';
    error.status = 'fail';
    error.isOperational = true;
  }
  
  if (err.name === 'TokenExpiredError') {
    error.statusCode = 401;
    error.message = 'Your token has expired! Please log in again.';
    error.status = 'fail';
    error.isOperational = true;
  }

  error.statusCode = error.statusCode || err.statusCode || 500;
  error.status = error.status || err.status || 'error';

  try {
    import('fs').then(fs => {
      fs.writeFileSync('error_log.json', JSON.stringify({
        message: err.message,
        stack: err.stack,
        name: err.name
      }, null, 2));
    });
  } catch(e) {}

  if (process.env.NODE_ENV === 'development') {
    res.status(error.statusCode).json({
      status: error.status,
      error: error,
      message: error.message,
      stack: err.stack,
    });
  } else {
    // Production
    if (error.isOperational) {
      res.status(error.statusCode).json({
        status: error.status,
        message: error.message,
      });
    } else {
      console.error('ERROR 💥', err);
      res.status(500).json({
        status: 'error',
        message: 'Something went wrong!',
      });
    }
  }
};
