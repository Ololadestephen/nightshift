// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { NightshiftReceiptRegistry } from "../NightshiftReceiptRegistry.sol";

contract CallerProxy {
    function publish(
        NightshiftReceiptRegistry registry,
        bytes32 jobRef,
        bytes32 inputHash,
        bytes32 outputHash,
        bytes32 summaryHash
    ) external returns (bytes32) {
        return registry.publishCompletionReceipt(jobRef, inputHash, outputHash, summaryHash);
    }
}

contract NightshiftReceiptRegistryTest {
    NightshiftReceiptRegistry internal registry;
    CallerProxy internal otherPublisher;

    bytes32 internal constant JOB_REF_HASH = keccak256("nightshift-job-ref/v1:nsref_v1_0123456789abcdef0123456789abcdef");
    bytes32 internal constant INPUT_HASH = keccak256("dataset-rows-v1");
    bytes32 internal constant OUTPUT_HASH = keccak256("report-body-v1");
    bytes32 internal constant SUMMARY_HASH = keccak256("recovery-summary-v1");

    function setUp() public {
        registry = new NightshiftReceiptRegistry();
        otherPublisher = new CallerProxy();
    }

    function testPublishAndRecordAttribution() public {
        bytes32 expectedId = registry.computeReceiptId(
            address(this),
            JOB_REF_HASH,
            INPUT_HASH,
            OUTPUT_HASH,
            SUMMARY_HASH
        );

        bytes32 receiptId = registry.publishCompletionReceipt(
            JOB_REF_HASH,
            INPUT_HASH,
            OUTPUT_HASH,
            SUMMARY_HASH
        );

        require(receiptId == expectedId, "receiptId mismatch");
        require(registry.receiptExists(receiptId), "receipt should exist");
        require(registry.totalReceipts() == 1, "totalReceipts should be 1");

        NightshiftReceiptRegistry.CompletionReceipt memory receipt = registry.getReceipt(receiptId);
        require(receipt.publisher == address(this), "publisher mismatch");
        require(receipt.jobReferenceHash == JOB_REF_HASH, "jobReferenceHash mismatch");
        require(receipt.inputHash == INPUT_HASH, "inputHash mismatch");
        require(receipt.outputHash == OUTPUT_HASH, "outputHash mismatch");
        require(receipt.recoverySummaryHash == SUMMARY_HASH, "recoverySummaryHash mismatch");
        require(receipt.publishedAt == block.timestamp, "publishedAt mismatch");

        bytes32[] memory byPub = registry.getPublisherReceipts(address(this));
        require(byPub.length == 1 && byPub[0] == receiptId, "publisher index mismatch");

        bytes32[] memory byJob = registry.getJobReferenceReceipts(JOB_REF_HASH);
        require(byJob.length == 1 && byJob[0] == receiptId, "jobReference index mismatch");
    }

    function testRejectDuplicatePublication() public {
        registry.publishCompletionReceipt(JOB_REF_HASH, INPUT_HASH, OUTPUT_HASH, SUMMARY_HASH);

        try registry.publishCompletionReceipt(JOB_REF_HASH, INPUT_HASH, OUTPUT_HASH, SUMMARY_HASH) {
            revert("Expected duplicate publication to revert");
        } catch {
            // Reverted as expected
        }
    }

    function testDistinctPublishersProduceDistinctReceipts() public {
        bytes32 id1 = registry.publishCompletionReceipt(
            JOB_REF_HASH,
            INPUT_HASH,
            OUTPUT_HASH,
            SUMMARY_HASH
        );
        bytes32 id2 = otherPublisher.publish(
            registry,
            JOB_REF_HASH,
            INPUT_HASH,
            OUTPUT_HASH,
            SUMMARY_HASH
        );

        require(id1 != id2, "distinct publishers must have distinct receiptIds");
        require(registry.totalReceipts() == 2, "totalReceipts should be 2");
        require(registry.getReceipt(id1).publisher == address(this), "first publisher mismatch");
        require(
            registry.getReceipt(id2).publisher == address(otherPublisher),
            "second publisher mismatch"
        );
    }

    function testRejectEmptyHashes() public {
        try registry.publishCompletionReceipt(bytes32(0), INPUT_HASH, OUTPUT_HASH, SUMMARY_HASH) {
            revert("Expected empty jobReferenceHash to revert");
        } catch {}

        try registry.publishCompletionReceipt(JOB_REF_HASH, bytes32(0), OUTPUT_HASH, SUMMARY_HASH) {
            revert("Expected empty inputHash to revert");
        } catch {}

        try registry.publishCompletionReceipt(JOB_REF_HASH, INPUT_HASH, bytes32(0), SUMMARY_HASH) {
            revert("Expected empty outputHash to revert");
        } catch {}

        try registry.publishCompletionReceipt(JOB_REF_HASH, INPUT_HASH, OUTPUT_HASH, bytes32(0)) {
            revert("Expected empty recoverySummaryHash to revert");
        } catch {}
    }

    function testMissingReceiptReverts() public view {
        try registry.getReceipt(keccak256("missing")) {
            revert("Expected missing receipt lookup to revert");
        } catch {}
    }
}
