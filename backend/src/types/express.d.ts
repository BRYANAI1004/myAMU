declare global {
  namespace Express {
    interface Request {
      adminUser?: import("../lib/adminAuthToken.js").AuthenticatedAdmin;
    }
  }
}

export {};
