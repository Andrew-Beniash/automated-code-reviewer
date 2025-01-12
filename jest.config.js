module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/src/$1',
      '^@client/(.*)$': '<rootDir>/src/client/$1',
      '^@server/(.*)$': '<rootDir>/src/server/$1',
      '^@shared/(.*)$': '<rootDir>/src/shared/$1'
    },
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts']
  };