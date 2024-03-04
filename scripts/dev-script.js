require("dotenv").config();
const { spawn } = require("child_process");

let command = "npm";
let args = ["run", "dev:monorepo"];

if (!process.env.FJS_MONOREPO) {
  command = "concurrently";
  args = [
    "--kill-others",
    '"next dev"',
    `"frames ${process.env.NEXT_PUBLIC_HOST ? "--url ${process.env.NEXT_PUBLIC_HOST}" : ""}  "`,
  ];
}

// Spawn the child process
const child = spawn(command, args, { stdio: "inherit", shell: true });

child.on("error", (error) => {
  console.error(`spawn error: ${error}`);
});
