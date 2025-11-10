export type PasswordEntryResponse = {
  id: string;
  name: string;
  username: string;
  password: string;
  url: string;
  notes?: string;
  tags: { id: number; name: string }[];
};

export type PasswordTableProps = {
  onEdit: (password: PasswordEntryResponse) => void;
};

export type Column = {
  accessorKey?: string;
  id?: string;
  header: string;
};
