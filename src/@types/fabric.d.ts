
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import fabric from "fabric";
import { ObserverObject } from './canvas';

declare module "fabric" {
  interface FabricObject {
    data?: ObserverObject;
  }
}