import { NextRequest, NextResponse } from "next/server";
import { getApplicationById } from "@/lib/db/applications";
import { getClientById } from "@/lib/db/clients";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import React from "react";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 40,
    color: "#1a1a1a",
  },
  header: {
    marginBottom: 20,
    borderBottom: "2pt solid #166534",
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#166534",
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 9,
    color: "#555",
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#166534",
    marginTop: 14,
    marginBottom: 6,
    borderBottom: "1pt solid #d1fae5",
    paddingBottom: 3,
  },
  row: {
    flexDirection: "row",
    marginBottom: 3,
  },
  label: {
    fontFamily: "Helvetica-Bold",
    width: "35%",
    color: "#333",
  },
  value: {
    width: "65%",
    color: "#111",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#166534",
    padding: 5,
    marginBottom: 0,
  },
  tableHeaderCell: {
    fontFamily: "Helvetica-Bold",
    color: "#fff",
    fontSize: 9,
    flex: 1,
  },
  tableRow: {
    flexDirection: "row",
    padding: 4,
    borderBottom: "0.5pt solid #e5e7eb",
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
  },
  disclosure: {
    marginBottom: 4,
    fontSize: 9,
    color: "#374151",
  },
  footer: {
    marginTop: 30,
    borderTop: "1pt solid #d1d5db",
    paddingTop: 10,
    fontSize: 8,
    color: "#6b7280",
  },
  signatureBlock: {
    flexDirection: "row",
    marginTop: 20,
    gap: 40,
  },
  signatureBox: {
    flex: 1,
  },
  signatureLine: {
    borderBottom: "1pt solid #374151",
    marginBottom: 4,
    height: 30,
  },
  signatureLabel: {
    fontSize: 8,
    color: "#6b7280",
  },
  bold: {
    fontFamily: "Helvetica-Bold",
  },
  warningBox: {
    backgroundColor: "#fef9c3",
    border: "1pt solid #fde047",
    padding: 6,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 2,
  },
});

function formatZAR(amount: number | undefined): string {
  if (amount == null) return "N/A";
  return `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function safeDate(iso: string | undefined): string {
  if (!iso) return "N/A";
  try {
    return new Date(iso).toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function safeDateTime(iso: string | undefined): string {
  if (!iso) return "N/A";
  try {
    return new Date(iso).toLocaleString("en-ZA");
  } catch {
    return iso;
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params;

    const application = await getApplicationById(applicationId);
    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Try to get client details
    let client = null;
    if (application.clientId) {
      client = await getClientById(application.clientId);
    }

    // Also check factFindData for client info
    const clientData = application.factFindData?.client || client;

    const roaDoc = React.createElement(
      Document,
      {
        title: `Record of Advice - ${application.referenceNumber}`,
        author: "Funeral Cover Studio",
        subject: "Record of Advice (ROA)",
      },
      React.createElement(
        Page,
        { size: "A4", style: styles.page },

        // ── HEADER ──────────────────────────────────────────────
        React.createElement(
          View,
          { style: styles.header },
          React.createElement(Text, { style: styles.headerTitle }, "RECORD OF ADVICE"),
          React.createElement(Text, { style: styles.headerSub }, "Funeral Cover Studio | FSP Licence No: 12345"),
          React.createElement(Text, { style: styles.headerSub }, `Reference: ${application.referenceNumber}`),
          React.createElement(Text, { style: styles.headerSub }, `Date Generated: ${safeDate(new Date().toISOString())}`),
          React.createElement(Text, { style: styles.headerSub }, `Application Status: ${application.status.toUpperCase()}`)
        ),

        // ── CLIENT DETAILS ───────────────────────────────────────
        React.createElement(Text, { style: styles.sectionTitle }, "1. Client Details"),

        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Full Name:"),
          React.createElement(
            Text,
            { style: styles.value },
            clientData
              ? `${clientData.firstName} ${clientData.lastName}`
              : "Not captured"
          )
        ),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, "ID Number:"),
          React.createElement(
            Text,
            { style: styles.value },
            clientData?.idNumber
              ? `******${clientData.idNumber.slice(-4)}`
              : "Not captured"
          )
        ),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Date of Birth:"),
          React.createElement(
            Text,
            { style: styles.value },
            clientData?.dateOfBirth ? safeDate(clientData.dateOfBirth) : "Not captured"
          )
        ),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Age:"),
          React.createElement(
            Text,
            { style: styles.value },
            clientData?.age != null ? String(clientData.age) : "Not captured"
          )
        ),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Mobile:"),
          React.createElement(
            Text,
            { style: styles.value },
            clientData?.mobile || "Not captured"
          )
        ),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Email:"),
          React.createElement(
            Text,
            { style: styles.value },
            clientData?.email || "Not captured"
          )
        ),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Employment Status:"),
          React.createElement(
            Text,
            { style: styles.value },
            clientData?.employmentStatus || "Not captured"
          )
        ),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Monthly Income:"),
          React.createElement(
            Text,
            { style: styles.value },
            clientData?.monthlyIncome != null
              ? formatZAR(clientData.monthlyIncome)
              : "Not captured"
          )
        ),

        // ── NEEDS ANALYSIS ────────────────────────────────────────
        React.createElement(Text, { style: styles.sectionTitle }, "2. Needs Analysis"),

        application.needsAnalysisData
          ? React.createElement(
              React.Fragment,
              null,
              React.createElement(
                View,
                { style: styles.row },
                React.createElement(Text, { style: styles.label }, "Total Funeral Cost:"),
                React.createElement(Text, { style: styles.value }, formatZAR(application.needsAnalysisData.totalFuneralCost))
              ),
              React.createElement(
                View,
                { style: styles.row },
                React.createElement(Text, { style: styles.label }, "Existing Cover:"),
                React.createElement(Text, { style: styles.value }, formatZAR(application.needsAnalysisData.existingCoverTotal))
              ),
              React.createElement(
                View,
                { style: styles.row },
                React.createElement(Text, { style: styles.label }, "Cash Savings:"),
                React.createElement(Text, { style: styles.value }, formatZAR(application.needsAnalysisData.cashSavings))
              ),
              React.createElement(
                View,
                { style: styles.row },
                React.createElement(Text, { style: styles.label }, "Cover Shortfall:"),
                React.createElement(Text, { style: styles.value }, formatZAR(application.needsAnalysisData.coverShortfall))
              ),
              React.createElement(
                View,
                { style: styles.row },
                React.createElement(Text, { style: styles.label }, "Recommended Cover:"),
                React.createElement(Text, { style: styles.value }, formatZAR(application.needsAnalysisData.recommendedCover))
              ),
              React.createElement(
                View,
                { style: styles.row },
                React.createElement(Text, { style: styles.label }, "Affordability Ratio:"),
                React.createElement(
                  Text,
                  { style: styles.value },
                  `${(application.needsAnalysisData.affordabilityRatio * 100).toFixed(1)}% of monthly income`
                )
              ),
              application.needsAnalysisData.adviserNotes
                ? React.createElement(
                    View,
                    { style: styles.row },
                    React.createElement(Text, { style: styles.label }, "Adviser Notes:"),
                    React.createElement(Text, { style: styles.value }, application.needsAnalysisData.adviserNotes)
                  )
                : null
            )
          : React.createElement(Text, { style: { color: "#888", fontSize: 9 } }, "Needs analysis not completed."),

        // ── PRODUCT SELECTED ──────────────────────────────────────
        React.createElement(Text, { style: styles.sectionTitle }, "3. Product Selected"),

        application.productSelectionData
          ? React.createElement(
              React.Fragment,
              null,
              React.createElement(
                View,
                { style: styles.row },
                React.createElement(Text, { style: styles.label }, "Product:"),
                React.createElement(Text, { style: styles.value }, application.productSelectionData.selectedProductName)
              ),
              application.productSelectionData.selectionReason
                ? React.createElement(
                    View,
                    { style: styles.row },
                    React.createElement(Text, { style: styles.label }, "Selection Reason:"),
                    React.createElement(Text, { style: styles.value }, application.productSelectionData.selectionReason)
                  )
                : null
            )
          : React.createElement(Text, { style: { color: "#888", fontSize: 9 } }, "Product not selected."),

        // ── COVER CONFIGURATION ───────────────────────────────────
        React.createElement(Text, { style: styles.sectionTitle }, "4. Cover Configuration"),

        application.configurationData
          ? React.createElement(
              React.Fragment,
              null,
              React.createElement(
                View,
                { style: styles.row },
                React.createElement(Text, { style: styles.label }, "Sum Assured:"),
                React.createElement(Text, { style: styles.value }, formatZAR(application.configurationData.sumAssured))
              ),
              React.createElement(
                View,
                { style: styles.row },
                React.createElement(Text, { style: styles.label }, "Monthly Premium:"),
                React.createElement(Text, { style: styles.value }, formatZAR(application.configurationData.monthlyPremium))
              ),
              React.createElement(
                View,
                { style: styles.row },
                React.createElement(Text, { style: styles.label }, "Admin Fee:"),
                React.createElement(Text, { style: styles.value }, formatZAR(application.configurationData.premiumBreakdown?.adminFee))
              ),
              React.createElement(
                View,
                { style: styles.row },
                React.createElement(Text, { style: styles.label }, "Total Members:"),
                React.createElement(
                  Text,
                  { style: styles.value },
                  String(application.configurationData.members?.length || 0)
                )
              ),

              // Members table
              application.configurationData.members &&
              application.configurationData.members.length > 0
                ? React.createElement(
                    React.Fragment,
                    null,
                    React.createElement(
                      View,
                      { style: { marginTop: 8 } },
                      React.createElement(
                        View,
                        { style: styles.tableHeader },
                        React.createElement(Text, { style: styles.tableHeaderCell }, "Name"),
                        React.createElement(Text, { style: styles.tableHeaderCell }, "Relationship"),
                        React.createElement(Text, { style: styles.tableHeaderCell }, "Age"),
                        React.createElement(Text, { style: styles.tableHeaderCell }, "Premium")
                      ),
                      ...application.configurationData.members.map((member, i) => {
                        const memberPrem = application.configurationData!.premiumBreakdown?.memberPremiums?.find(
                          (mp) => mp.memberId === member.id
                        );
                        return React.createElement(
                          View,
                          { key: i, style: { ...styles.tableRow, backgroundColor: i % 2 === 0 ? "#f9fafb" : "#fff" } },
                          React.createElement(Text, { style: styles.tableCell }, member.firstName + " " + member.lastName),
                          React.createElement(Text, { style: styles.tableCell }, member.type || "main"),
                          React.createElement(Text, { style: styles.tableCell }, String(member.age || "N/A")),
                          React.createElement(Text, { style: styles.tableCell }, formatZAR(memberPrem?.premium))
                        );
                      })
                    )
                  )
                : null
            )
          : React.createElement(Text, { style: { color: "#888", fontSize: 9 } }, "Cover not configured."),

        // ── RECOMMENDATION ────────────────────────────────────────
        React.createElement(Text, { style: styles.sectionTitle }, "5. Recommendation & Motivation"),

        application.roaData
          ? React.createElement(
              React.Fragment,
              null,
              React.createElement(
                View,
                { style: { marginBottom: 6 } },
                React.createElement(
                  Text,
                  { style: { fontSize: 10, lineHeight: 1.5 } },
                  application.roaData.recommendationMotivation
                )
              ),
              application.roaData.productsConsidered &&
              application.roaData.productsConsidered.length > 0
                ? React.createElement(
                    React.Fragment,
                    null,
                    React.createElement(
                      Text,
                      { style: { fontFamily: "Helvetica-Bold", fontSize: 9, marginTop: 6, marginBottom: 4 } },
                      "Products Considered:"
                    ),
                    ...application.roaData.productsConsidered.map((p, i) =>
                      React.createElement(
                        View,
                        { key: i, style: styles.row },
                        React.createElement(Text, { style: styles.label }, p.productName + ":"),
                        React.createElement(Text, { style: styles.value }, p.reason)
                      )
                    )
                  )
                : null
            )
          : React.createElement(Text, { style: { color: "#888", fontSize: 9 } }, "Record of Advice not completed."),

        // ── DISCLOSURES SUMMARY ────────────────────────────────────
        React.createElement(Text, { style: styles.sectionTitle }, "6. Disclosures Accepted"),

        application.disclosureData
          ? React.createElement(
              React.Fragment,
              null,
              React.createElement(
                View,
                { style: styles.row },
                React.createElement(Text, { style: styles.label }, "Total Disclosures:"),
                React.createElement(
                  Text,
                  { style: styles.value },
                  String(application.disclosureData.acceptances?.length || 0)
                )
              ),
              React.createElement(
                View,
                { style: styles.row },
                React.createElement(Text, { style: styles.label }, "Completed At:"),
                React.createElement(
                  Text,
                  { style: styles.value },
                  safeDateTime(application.disclosureData.completedAt)
                )
              ),
              ...(application.disclosureData.acceptances || []).map((acc, i) =>
                React.createElement(
                  View,
                  { key: i, style: styles.disclosure },
                  React.createElement(
                    Text,
                    null,
                    `\u2713 Disclosure ${acc.disclosureId} accepted at ${safeDateTime(acc.acceptedAt)}`
                  )
                )
              )
            )
          : React.createElement(
              View,
              { style: styles.warningBox },
              React.createElement(
                Text,
                { style: { fontSize: 9, color: "#854d0e" } },
                "WARNING: Disclosures have not been completed for this application."
              )
            ),

        // ── SIGNATURES ─────────────────────────────────────────────
        React.createElement(Text, { style: styles.sectionTitle }, "7. Signatures"),

        application.acceptanceData
          ? React.createElement(
              React.Fragment,
              null,
              React.createElement(
                View,
                { style: styles.row },
                React.createElement(Text, { style: styles.label }, "Client Signed At:"),
                React.createElement(
                  Text,
                  { style: styles.value },
                  safeDateTime(application.acceptanceData.clientSignedAt)
                )
              ),
              React.createElement(
                View,
                { style: styles.row },
                React.createElement(Text, { style: styles.label }, "Adviser Signed At:"),
                React.createElement(
                  Text,
                  { style: styles.value },
                  safeDateTime(application.acceptanceData.adviserSignedAt)
                )
              ),
              application.acceptanceData.declarationText
                ? React.createElement(
                    View,
                    { style: { marginTop: 8, padding: 6, backgroundColor: "#f0fdf4", border: "1pt solid #bbf7d0" } },
                    React.createElement(
                      Text,
                      { style: { fontSize: 8, color: "#166534", lineHeight: 1.4 } },
                      application.acceptanceData.declarationText
                    )
                  )
                : null,
              React.createElement(
                View,
                { style: styles.signatureBlock },
                React.createElement(
                  View,
                  { style: styles.signatureBox },
                  React.createElement(View, { style: styles.signatureLine }),
                  React.createElement(Text, { style: styles.signatureLabel }, "Client Signature"),
                  React.createElement(
                    Text,
                    { style: { ...styles.signatureLabel, marginTop: 2 } },
                    `Signed: ${safeDateTime(application.acceptanceData.clientSignedAt)}`
                  )
                ),
                React.createElement(
                  View,
                  { style: styles.signatureBox },
                  React.createElement(View, { style: styles.signatureLine }),
                  React.createElement(Text, { style: styles.signatureLabel }, "Adviser Signature"),
                  React.createElement(
                    Text,
                    { style: { ...styles.signatureLabel, marginTop: 2 } },
                    `Signed: ${safeDateTime(application.acceptanceData.adviserSignedAt)}`
                  )
                )
              )
            )
          : React.createElement(
              View,
              { style: styles.warningBox },
              React.createElement(
                Text,
                { style: { fontSize: 9, color: "#854d0e" } },
                "WARNING: This application has not yet been signed."
              )
            ),

        // ── FOOTER ─────────────────────────────────────────────────
        React.createElement(
          View,
          { style: styles.footer },
          React.createElement(
            Text,
            null,
            "This Record of Advice is prepared in accordance with the Financial Advisory and Intermediary Services Act (FAIS), Act 37 of 2002."
          ),
          React.createElement(
            Text,
            { style: { marginTop: 3 } },
            `Funeral Cover Studio | FSP Licence No: 12345 | Generated: ${new Date().toLocaleString("en-ZA")}`
          ),
          React.createElement(
            Text,
            { style: { marginTop: 3 } },
            `Application Reference: ${application.referenceNumber}`
          )
        )
      )
    );

    const buffer = await renderToBuffer(roaDoc);
    // Convert Node.js Buffer to Uint8Array for the Web API Response constructor
    const uint8Array = new Uint8Array(buffer);

    return new Response(uint8Array, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Record-of-Advice-${application.referenceNumber}.pdf"`,
        "Content-Length": String(uint8Array.byteLength),
      },
    });
  } catch (error) {
    console.error("GET /api/documents/[applicationId]/roa error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
