export type PasswordEntry = {
  id: string;
  name: string;
  username: string;
  password: string;
  url: string;
  notes?: string;
  tags: { id: number; name: string }[];
};

export type PasswordTableProps = {
  onEdit: (password: PasswordEntry) => void;
};

export type Column = {
  accessorKey?: string;
  id?: string;
  header: string;
}; 