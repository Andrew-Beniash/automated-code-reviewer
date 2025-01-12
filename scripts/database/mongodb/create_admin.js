// File: ~/Documents/Projects/automated-code-reviewer/scripts/database/mongodb/create_admin.js

// Switch to admin database
db = db.getSiblingDB("admin");

// Create root admin user
db.createUser({
  user: "adminUser",
  pwd: passwordPrompt(), // Will prompt for password
  roles: [
    { role: "root", db: "admin" },
    { role: "userAdminAnyDatabase", db: "admin" },
    { role: "readWriteAnyDatabase", db: "admin" },
  ],
});

// Switch to code_analysis database
db = db.getSiblingDB("code_analysis");

// Create application user
db.createUser({
  user: "code_reviewer_app",
  pwd: passwordPrompt(), // Will prompt for second password
  roles: [
    { role: "readWrite", db: "code_analysis" },
    { role: "dbAdmin", db: "code_analysis" },
  ],
});

print("Users created successfully!");
print("Next steps:");
print("1. Stop MongoDB");
print("2. Enable authentication in mongod.conf");
print("3. Restart MongoDB");
print("4. Test connection with: mongosh admin -u adminUser -p");
