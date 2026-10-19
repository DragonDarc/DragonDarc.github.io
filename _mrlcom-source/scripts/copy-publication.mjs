import { cp, rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const source = fileURLToPath(new URL('../dist/', import.meta.url));
const destination = fileURLToPath(new URL('../../mrlcom/', import.meta.url));
if (path.basename(destination) !== 'mrlcom') throw new Error('Unexpected publication directory');
await stat(path.join(source, 'index.html'));
// Only this app's generated folder is replaced. The portfolio remains at the root.
await rm(destination, { recursive: true, force: true });
await cp(source, destination, { recursive: true });
console.log('MRLCOM publication files updated');
