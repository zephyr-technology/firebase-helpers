import { OrderByConstraint, WhereContraint } from "./types";

/**
 * Create a Firestore "where" constraint. Used as a filter.
 * @param fieldPath Document field
 * @param opStr Comparison string
 * @param value Value to compare to
 * @returns WhereContraint
 */
export function where(
  fieldPath: string,
  opStr: FirebaseFirestore.WhereFilterOp,
  value: any
): WhereContraint {
  return {
    type: "where",
    fieldPath: fieldPath,
    opStr: opStr,
    value: value,
  };
}

/**
 * Create a Firestore "orderBy" constraint. Used to sort values.
 * @param fieldPath Document field
 * @param directionStr asc | desc
 * @returns OrderByConstraint
 */
export function orderBy(
  fieldPath: string,
  directionStr?: FirebaseFirestore.OrderByDirection
): OrderByConstraint {
  return {
    type: "orderBy",
    fieldPath: fieldPath,
    directionStr: directionStr,
  };
}
