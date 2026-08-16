/** Tests unitaires (logique pure). Voir src/lib/__tests__. */
module.exports = {
  testEnvironment: "node",
  transform: { "^.+\\.(t|j)sx?$": "babel-jest" },
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  testMatch: ["**/__tests__/**/*.test.ts?(x)"],
};
