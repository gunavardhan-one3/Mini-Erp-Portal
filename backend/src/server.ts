import { app } from "./app";
import { env } from "./utils/env";

app.listen(env.PORT, () => {
  console.log(`API server listening on http://localhost:${env.PORT}`);
});
