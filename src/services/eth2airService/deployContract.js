import web3Service from './../web3Service';
// #TODO move this to meta.js
import { BYTECODE, ABI } from '../../contract-abi/abi'; 
import { generateAccount } from './utils';

const _sendContractDeploymentTx = ({
    airdropParams,
    txGas,
    txValue,
    onTxMined
}) => {    
    return new Promise((resolve, reject) => {
	const web3 = web3Service.getWeb3();
	const AirdropContract = web3.eth.contract(ABI);    
	let { tokenAddress, claimAmountAtomic, claimAmountEthInWei, airdropTransitAddress } = airdropParams;
	
	AirdropContract.new(tokenAddress, claimAmountAtomic, claimAmountEthInWei, airdropTransitAddress, {
    	    from: web3.eth.accounts[0],
    	    data: BYTECODE,
	    value: txValue,
    	    gas: txGas
	},  (err, airdropContract) => {
    	    if(err) { reject(err); return null;}
    	    // NOTE: The callback will fire twice!
    	    // Once the contract has the transactionHash property set and once its deployed on an address.
	    
    	    // e.g. check tx hash on the first call (transaction send)
    	    if(!airdropContract.address) {
    		resolve(airdropContract.transactionHash); // The hash of the transaction, which deploys the contract		
    		// check address on the second call (contract deployed)
    	    } else {
		onTxMined(airdropContract.address);
	    }
	});
    });
}				     


export const deployContract = async ({ claimAmount, tokenAddress, decimals, claimAmountEth, linksNumber, onTxMined }) => {
    const web3 = web3Service.getWeb3();

    // Generate special key pair (Aidrop Transit Key Pair) for the airdrop.
    // (Ethereum address from the Airdrop Transit Private Key stored to the Airdrop Smart Contract as AIRDROP_TRANSIT_ADDRESS
    // 
    // Airdrop Transit Private Key used for signing other transit private keys generated per link.
    // 
    // The Airdrop Contract verifies that the private key from the link is signed by the Airdrop Transit Private Key,
    // which means that the claim link was signed by the Airdropper)
    const { privateKey: airdropTransitPK, address: airdropTransitAddress } = generateAccount();

    // airdrop contract params
    const claimAmountAtomic = web3.toBigNumber(claimAmount).shift(decimals);
    const claimAmountEthInWei = web3.toBigNumber(claimAmountEth).shift(18);
    const airdropParams = {
	tokenAddress,
	claimAmountAtomic,
	claimAmountEthInWei,
	airdropTransitAddress
    };
        
    // tx params
    const gasEstimate = await web3.eth.estimateGasPromise({data: BYTECODE});
    const txGas = gasEstimate + 100000;
    const txValue = claimAmountEthInWei * linksNumber;

    // deploy contract
    const txHash = await _sendContractDeploymentTx({airdropParams, txGas, txValue, onTxMined});

    return {
	txHash, 
	airdropTransitPK,
	airdropTransitAddress
    };
}
