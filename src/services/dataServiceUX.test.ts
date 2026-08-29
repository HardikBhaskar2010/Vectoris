/**
 * dataServiceUX.test.ts — Unit tests for UX interactivity operations in dataService.
 */

import { dataService } from "./dataService";

export async function runDataServiceUXTests() {
  console.log("\n▶ Running DataService UX & Interactivity Tests...");

  // 1. Test seedSampleProject
  const sampleProject = dataService.seedSampleProject();
  if (!sampleProject || !sampleProject.id) {
    throw new Error(`seedSampleProject failed: expected valid project with id, got '${sampleProject?.id}'`);
  }

  const sampleSheets = dataService.getSheets(sampleProject.id);
  if (sampleSheets.length === 0) {
    throw new Error("seedSampleProject failed: no sheets generated");
  }

  const sampleItems = dataService.getLineItems(sampleProject.id);
  if (sampleItems.length === 0) {
    throw new Error("seedSampleProject failed: no line items generated");
  }
  console.log("  ✓ seedSampleProject created deterministic project with sheets and line items");

  // 2. Test correctLineItem and audit record creation
  const firstItem = sampleItems[0];
  const oldQty = firstItem.quantity;
  const newQty = oldQty + 10;
  const reason = "Engineering adjustment based on drawing addendum";
  
  dataService.correctLineItem(firstItem.id, newQty, firstItem.unit, reason, "Test Lead Estimator");
  
  const updatedItems = dataService.getLineItems(sampleProject.id);
  const updatedItem = updatedItems.find((i) => i.id === firstItem.id);
  
  if (!updatedItem) {
    throw new Error("correctLineItem failed: item not found after update");
  }
  if (updatedItem.quantity !== newQty) {
    throw new Error(`correctLineItem failed: expected quantity ${newQty}, got ${updatedItem.quantity}`);
  }
  if (!updatedItem.correction_history || updatedItem.correction_history.length === 0) {
    throw new Error("correctLineItem failed: correction_history record not created");
  }
  const lastCorrection = updatedItem.correction_history[updatedItem.correction_history.length - 1];
  if (lastCorrection.user !== "Test Lead Estimator") {
    throw new Error(`correctLineItem failed: expected user 'Test Lead Estimator', got '${lastCorrection.user}'`);
  }
  console.log("  ✓ correctLineItem correctly updated quantity and appended audit trail");

  // 3. Test deleteProject cascade
  await dataService.deleteProject(sampleProject.id);
  const projectsAfterDelete = dataService.getProjects();
  if (projectsAfterDelete.some((p) => p.id === sampleProject.id)) {
    throw new Error("deleteProject failed: project still exists in getProjects()");
  }
  const sheetsAfterDelete = dataService.getSheets(sampleProject.id);
  if (sheetsAfterDelete.length > 0) {
    throw new Error("deleteProject failed: sheets not cascaded");
  }
  const itemsAfterDelete = dataService.getLineItems(sampleProject.id);
  if (itemsAfterDelete.length > 0) {
    throw new Error("deleteProject failed: line items not cascaded");
  }
  console.log("  ✓ deleteProject successfully cascaded and removed project, sheets, and line items");

  // 4. Test document retry with error state
  const testDocId = "test-doc-retry";
  dataService.cacheDocumentBytes(testDocId, new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52])); // %PDF-1.4 header
  dataService.addDocuments("p1", [
    {
      id: testDocId,
      filename: "test_drawing.pdf",
      format: "PDF",
      size_mb: 1.2,
      uploaded_by: "Hardik Bhaskar",
    },
  ]);

  const docBeforeRetry = dataService.getDocuments("p1").find((d) => d.id === testDocId);
  if (docBeforeRetry) {
    docBeforeRetry.upload_status = "error";
    docBeforeRetry.error_message = "Corrupt stream";
  } else {
    throw new Error("Failed to set up test error document");
  }

  // Execute retry
  await dataService.retryDocumentProcessing("p1", testDocId);
  const docAfterRetry = dataService.getDocuments("p1").find((d) => d.id === testDocId);
  if (!docAfterRetry || (docAfterRetry.upload_status !== "complete" && docAfterRetry.upload_status !== "parsed")) {
    throw new Error(`retryDocumentProcessing failed: expected status 'complete' or 'parsed', got '${docAfterRetry?.upload_status}'`);
  }
  console.log("  ✓ retryDocumentProcessing successfully re-processed error document to complete");

  // Cleanup test doc
  dataService.removeDocument(testDocId);

  console.log("✔ All DataService UX & Interactivity Tests Passed!");
}
