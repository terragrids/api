'use strict';

import { app } from './app.js';

const port = process.env.PORT || 3003;

app.listen(port);
console.info(`Listening to http://localhost:${port} 🚀`);
