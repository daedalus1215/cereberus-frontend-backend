import styles from "./HomePage.module.css";
import { cn } from "@/lib/utils";
import { PasswordTable } from "@/pages/HomePage/components/PasswordTable/PasswordTable";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HomePage() {
  const [showModal, setShowModal] = useState(false);
  return (
    <div className={cn(styles.homePage)}>
      <main className={cn(styles.homeMain)}>
        <div className="stretchTable">
          <div style={{ width: "100%" }}>
            <PasswordTable />
          </div>
        </div>
      </main>
      {/* FAB */}
      <Button
        variant="default"
        size="lg"
        style={{
          position: "fixed",
          bottom: 32,
          right: 32,
          borderRadius: "50%",
          width: 56,
          height: 56,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          zIndex: 1000,
        }}
        onClick={() => setShowModal(true)}
        aria-label="Add new password"
      >
        <Plus size={28} />
      </Button>
      {/* Modal Placeholder */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 32,
              minWidth: 320,
              boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
              position: "relative",
            }}
          >
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "none",
                border: "none",
                fontSize: 24,
                cursor: "pointer",
              }}
              aria-label="Close modal"
            >
              ×
            </button>
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <h2 style={{ marginBottom: 12 }}>Create New Password</h2>
              <p>Modal placeholder for password creation form.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
