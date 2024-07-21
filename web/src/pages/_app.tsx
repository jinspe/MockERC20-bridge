import { GeistSans } from "geist/font/sans";
import { type AppType } from "next/app";

import { api } from "~/utils/api";

import "~/styles/globals.css";
import Web3Provider from "~/components/Web3Provider";

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <div className={GeistSans.className}>
      <Web3Provider>
        <Component {...pageProps} />
      </Web3Provider>
    </div>
  );
};

export default api.withTRPC(MyApp);
