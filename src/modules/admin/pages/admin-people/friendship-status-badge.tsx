import { Badge } from "@/components/ui/badge";
import { useAdminTranslation } from "../../i18n";
import { FRIENDSHIP_STATUS } from "./utils";

export function FriendshipStatusBadge({ status }: { status: keyof typeof FRIENDSHIP_STATUS }) {
  const { tAdmin } = useAdminTranslation();
  const config = FRIENDSHIP_STATUS[status];
  return <Badge className={config.className}>{tAdmin(config.labelKey)}</Badge>;
}
