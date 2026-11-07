// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title NightshiftReceiptRegistry
 * @notice Immutable completion-receipt registry for verified Nightshift report jobs on BOT Chain.
 * @dev Commits only publisher attribution and 32-byte fingerprints of:
 *      - versioned job reference
 *      - original dataset input
 *      - reconciled report output
 *      - sanitized recovery summary
 *
 *      No raw dataset rows, report bodies, model prompts, credentials, or error traces are stored on-chain.
 *      A blockchain receipt attests publication and fingerprint integrity; it does not independently
 *      execute or prove the off-chain recovery computation.
 */
contract NightshiftReceiptRegistry {
    struct CompletionReceipt {
        address publisher;
        bytes32 jobReferenceHash;
        bytes32 inputHash;
        bytes32 outputHash;
        bytes32 recoverySummaryHash;
        uint256 publishedAt;
    }

    mapping(bytes32 => CompletionReceipt) private _receipts;
    bytes32[] public receiptIds;
    mapping(address => bytes32[]) private _publisherReceipts;
    mapping(bytes32 => bytes32[]) private _jobReferenceReceipts;

    event CompletionReceiptPublished(
        bytes32 indexed receiptId,
        address indexed publisher,
        bytes32 indexed jobReferenceHash,
        bytes32 inputHash,
        bytes32 outputHash,
        bytes32 recoverySummaryHash,
        uint256 publishedAt
    );

    error EmptyJobReferenceHash();
    error EmptyInputHash();
    error EmptyOutputHash();
    error EmptyRecoverySummaryHash();
    error ReceiptAlreadyExists(bytes32 receiptId);
    error ReceiptNotFound(bytes32 receiptId);

    /**
     * @notice Publishes an immutable completion receipt for a verified report job.
     */
    function publishCompletionReceipt(
        bytes32 jobReferenceHash,
        bytes32 inputHash,
        bytes32 outputHash,
        bytes32 recoverySummaryHash
    ) external returns (bytes32 receiptId) {
        if (jobReferenceHash == bytes32(0)) revert EmptyJobReferenceHash();
        if (inputHash == bytes32(0)) revert EmptyInputHash();
        if (outputHash == bytes32(0)) revert EmptyOutputHash();
        if (recoverySummaryHash == bytes32(0)) revert EmptyRecoverySummaryHash();

        receiptId = computeReceiptId(
            msg.sender,
            jobReferenceHash,
            inputHash,
            outputHash,
            recoverySummaryHash
        );

        if (_receipts[receiptId].publishedAt != 0) {
            revert ReceiptAlreadyExists(receiptId);
        }

        _receipts[receiptId] = CompletionReceipt({
            publisher: msg.sender,
            jobReferenceHash: jobReferenceHash,
            inputHash: inputHash,
            outputHash: outputHash,
            recoverySummaryHash: recoverySummaryHash,
            publishedAt: block.timestamp
        });

        receiptIds.push(receiptId);
        _publisherReceipts[msg.sender].push(receiptId);
        _jobReferenceReceipts[jobReferenceHash].push(receiptId);

        emit CompletionReceiptPublished(
            receiptId,
            msg.sender,
            jobReferenceHash,
            inputHash,
            outputHash,
            recoverySummaryHash,
            block.timestamp
        );
    }

    /**
     * @notice Computes the deterministic receipt identifier for a publication.
     */
    function computeReceiptId(
        address publisher,
        bytes32 jobReferenceHash,
        bytes32 inputHash,
        bytes32 outputHash,
        bytes32 recoverySummaryHash
    ) public pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    publisher,
                    jobReferenceHash,
                    inputHash,
                    outputHash,
                    recoverySummaryHash
                )
            );
    }

    function getReceipt(bytes32 receiptId) external view returns (CompletionReceipt memory) {
        CompletionReceipt memory receipt = _receipts[receiptId];
        if (receipt.publishedAt == 0) revert ReceiptNotFound(receiptId);
        return receipt;
    }

    function receiptExists(bytes32 receiptId) external view returns (bool) {
        return _receipts[receiptId].publishedAt != 0;
    }

    function totalReceipts() external view returns (uint256) {
        return receiptIds.length;
    }

    function getPublisherReceipts(address publisher) external view returns (bytes32[] memory) {
        return _publisherReceipts[publisher];
    }

    function getJobReferenceReceipts(bytes32 jobReferenceHash)
        external
        view
        returns (bytes32[] memory)
    {
        return _jobReferenceReceipts[jobReferenceHash];
    }
}
