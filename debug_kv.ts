import { KvClient } from "@0gfoundation/0g-storage-ts-sdk";
import { ethers } from "ethers";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function check() {
    const userId = "5697137067";
    const key = `telegram:wallet:${userId}`;
    const kvUrl = "http://3.101.147.150:6789";
    const streamId = ethers.keccak256(ethers.toUtf8Bytes(process.env.OG_STREAM_ID ?? "axiom-default-stream"));

    console.log(`Checking KV at ${kvUrl}`);
    console.log(`Stream ID: ${streamId}`);
    console.log(`Key: ${key}`);

    const client = new KvClient(kvUrl);
    const keyBytes = Uint8Array.from(Buffer.from(key, "utf-8"));
    
    try {
        const val = await client.getValue(streamId, keyBytes);
        if (val) {
            console.log("FOUND VALUE:", Buffer.from(val as any).toString("utf-8"));
        } else {
            console.log("VALUE NOT FOUND");
        }
    } catch (e) {
        console.error("ERROR:", e);
    }
}

check();
