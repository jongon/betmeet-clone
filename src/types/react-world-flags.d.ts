declare module "react-world-flags" {
  import * as React from "react";

  export interface ReactWorldFlagsProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    code: string;
    fallback?: React.ReactNode;
  }

  const Flag: React.FC<ReactWorldFlagsProps>;
  export default Flag;
}
