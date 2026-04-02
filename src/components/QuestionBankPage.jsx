import { useState } from "react";
import { ClipboardList, BookOpen, Activity, Upload, PlusCircle } from "lucide-react";
import { C } from "../ui";
import ReviewQueueTab from "./QuestionBankPage/ReviewQueueTab";
import BrowseTab from "./QuestionBankPage/BrowseTab";
import IngestionLogTab from "./QuestionBankPage/IngestionLogTab";
import ImportTab from "./QuestionBankPage/ImportTab";
import AddQuestionTab from "./QuestionBankPage/AddQuestionTab";

// ─── Main Page ────────────────────────────────────────────────

const TABS = [
  { id: "add", label: "Add Question", icon: <PlusCircle size={15} /> },
  { id: "import", label: "Bulk Import", icon: <Upload size={15} /> },
  { id: "browse", label: "Browse", icon: <BookOpen size={15} /> },
  { id: "queue", label: "Review Queue", icon: <ClipboardList size={15} /> },
  { id: "log", label: "Ingestion Log", icon: <Activity size={15} /> },
];

export default function QuestionBankPage() {
  const [activeTab, setActiveTab] = useState("add");

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>📚 Question Bank</h2>
        <p style={{ color: C.gray600, fontSize: 14 }}>
          Review flagged questions, browse the full question bank, import test files, and track ingestion history.
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: `2px solid ${C.gray200}`, paddingBottom: 0 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "10px 16px", borderRadius: "8px 8px 0 0",
              border: "none", cursor: "pointer", fontFamily: "inherit",
              fontSize: 13, fontWeight: 600,
              background: activeTab === tab.id ? C.white : "transparent",
              color: activeTab === tab.id ? C.navy : C.gray400,
              borderBottom: activeTab === tab.id ? `2px solid ${C.gold}` : "2px solid transparent",
              marginBottom: -2,
              transition: "all 0.15s",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ background: C.offWhite, borderRadius: 16, padding: 24, border: `1px solid ${C.gray200}` }}>
        {activeTab === "add" && <AddQuestionTab />}
        {activeTab === "import" && <ImportTab />}
        {activeTab === "browse" && <BrowseTab />}
        {activeTab === "queue" && <ReviewQueueTab />}
        {activeTab === "log" && <IngestionLogTab />}
      </div>
    </div>
  );
}
