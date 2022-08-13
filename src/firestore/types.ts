export interface QR {
  id: string;
  ref: string;
}

export interface WhereContraint {
  type: "where";
  fieldPath: string;
  opStr?:
    | "<"
    | "<="
    | "=="
    | "!="
    | ">="
    | ">"
    | "array-contains"
    | "in"
    | "not-in"
    | "array-contains-any"; // FirebaseFirestore.WhereFilterOp
  value?: any;
}

export interface OrderByConstraint {
  type: "orderBy";
  fieldPath: string;
  directionStr?: "desc" | "asc";
}

// Query constraints are used to filter and sort collection queries
export type QueryConstraint = WhereContraint | OrderByConstraint;

// Cursors are used for pagination
export interface QueryCursor {
  interval: number;
  hasNext: boolean;
  startAfter?: string; // Reference value
}

export interface QueryReq {
  cursor?: QueryCursor;
}

export interface QueryRes<T> {
  data: (T & QR)[];
  cursor: QueryCursor;
}