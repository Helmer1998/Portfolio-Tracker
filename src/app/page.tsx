import Link from "next/link";
import HoldingsClient from "./HoldingsClient";

export default function Page() {
  return (
    <>
      {/* Floating button, opens in a new tab */}
      <div className="fixed top-4 right-4 z-20">
        <Link
          href="https://doggy.market/nfts/baby-chinchillas"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-fuchsia-600/90 px-4 py-2 text-white shadow-lg hover:bg-fuchsia-600"
        >
          Baby Chinchillas NFT ↗
        </Link>
      </div>

      <HoldingsClient />
    </>
  );
}
