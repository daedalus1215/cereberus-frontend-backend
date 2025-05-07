import styles from "./HomePage.module.css";
import { cn } from "@/lib/utils";
import { PasswordTable } from "@/pages/HomePage/components/PasswordTable/PasswordTable";

export function HomePage() {
  return (
    <div className={cn(styles.homePage)}>
      <main className={cn(styles.homeMain)}>
        <div className="stretchTable">
          <div style={{ width: "100%" }}>
            <PasswordTable />
          </div>
        </div>
      </main>
    </div>
  );
}
