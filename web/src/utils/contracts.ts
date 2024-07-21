export const ARBITRUM_SEP_CONTRACT_ADDRESS =
  "0x50B09EDaB5F9Bb0Cd83EC847131e67E683BbC986";

export const OPTIMISM_SEP_CONTRACT_ADDRESS =
  "0x7DfA9A4Aced727b0349D8fB68473c2FdC8f51aB5";

export const contractAbi = [
  "function balanceOf(address) view returns (uint256)",
  "function mint(address to, uint256 amount)",
  "function burn(uint256 amount)",
  "event TokensMinted(address indexed to, uint256 amount)",
  "event TokensBurned(address indexed from, uint256 amount)",
];
