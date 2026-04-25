import { Wallet } from "ethers";
const pk = "7c7f7a0a12b6e8b2383a0dc27d28bf92c24280aaea0383696b9a30a8caa53d74";
const wallet = new Wallet(pk);
console.log("Address:", wallet.address);
