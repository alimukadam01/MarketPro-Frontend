import axios from "axios";
import { toast } from "sonner";
import {
  ACCESS_DENIED_MESSAGE,
  transformSalesInvoice,
  transformPurchaseInvoice,
  transformInventoryItem,
  transformProduct,
  formatSearchQuery,
  transformProductVariant,
  formatConfig,
} from "./utils";
import { withPeriod } from "./periods";

const DEBUG = true;

export const BASE_URL = DEBUG
  ? "http://localhost:8000/"
  : "https://backend.market-pro.pk/";


const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Every fetcher below swallows its errors and returns null, so an expired
// token would otherwise just render empty pages. AuthProvider registers a
// handler here that ends the session and sends the user back to login.
let onUnauthorized = null;

export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    // A 401 from the login call is a wrong password, not a dead session.
    const isLoginAttempt = url.includes("auth/jwt/create");

    if (error.response?.status === 401 && !isLoginAttempt && onUnauthorized) {
      onUnauthorized();
    }

    // A module the user may not see answers 403, never 401 — 401 above ends
    // the session, so using it for a permissions problem would sign someone
    // out instead of telling them. One toast here means every caller reports
    // it identically without each one having to check the status.
    if (error.response?.status === 403) {
      toast.error(ACCESS_DENIED_MESSAGE);
    }

    return Promise.reject(error);
  }
);

export default class APIPackage {
  constructor(resource) {
    this.resource = resource;
  }

  getHeaders(token) {
    return {
      Authorization: token,
    };
  }

  async list(token, searchQuery = null) {
    try {
      const url = `/${this.resource}/${searchQuery ? searchQuery : ""}`;
      const res = await apiClient.get(url, {
        headers: this.getHeaders(token),
      });

      return res.status === 200 ? res.data : null;
    } catch (error) {
      console.log(`Error fetching ${this.resource} list:`, error);
      return null;
    }
  }

  async detail(token, id) {
    try {
      const res = await apiClient.get(`/${this.resource}/${id}/`, {
        headers: this.getHeaders(token),
      });

      return res.status === 200 ? res.data : null;
    } catch (error) {
      console.log(`Error fetching ${this.resource} detail:`, error);
      return null;
    }
  }

  async create(token, data) {
    try {
      const res = await apiClient.post(`/${this.resource}/`, data, {
        headers: this.getHeaders(token),
      });

      return res.status === 201;
    } catch (error) {
      console.log(`Error creating ${this.resource}:`, error);
      return false;
    }
  }

  async update(token, id, data) {
    try {
      const res = await apiClient.put(`/${this.resource}/${id}/`, data, {
        headers: this.getHeaders(token),
      });

      return res.status === 200;
    } catch (error) {
      console.log(`Error updating ${this.resource}:`, error);
      return false;
    }
  }

  async delete(token, id) {
    try {
      const res = await apiClient.delete(`/${this.resource}/${id}/`, {
        headers: this.getHeaders(token),
      });

      // 204 is DRF's default, but the viewsets that override destroy return
      // 200 with {"detail": "Success."} - the project's own response
      // convention. Accepting only 204 meant transactions, money accounts and
      // backlog entries really were deleted while the caller was told the
      // delete had failed, so the list never refreshed.
      return res.status === 204 || res.status === 200;
    } catch (error) {
      console.log(`Error deleting ${this.resource}:`, error);
      return false;
    }
  }

  async bulkDelete(token, ids, param = null) {
    try {
      const res = await apiClient.post(
        `/${this.resource}/bulk-delete/`,
        { [`${param ? param : this.resource.slice(0, -1)}_ids`]: ids },
        {
          headers: this.getHeaders(token),
        },
      );

      if (res.status !== 200) return false;

      // An endpoint that reports how many rows it removed lets us tell a real
      // delete from a selection that matched nothing — transactions used to
      // answer "Success" while silently skipping every row it refused.
      // Endpoints that report no count are unaffected.
      if (typeof res.data?.deleted === "number") return res.data.deleted > 0;
      return true;
    } catch (error) {
      console.log(`Error bulk deleting ${this.resource}:`, error);
      return false;
    }
  }
}

export const patchResource = async (token, endpoint, data) => {
  try {
    const res = await apiClient.patch(endpoint, data, {
      headers: {
        Authorization: token,
      },
    });
    if (res.status === 200) {
      return true;
    }
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const locationsAPIPackage = new APIPackage("locations");
export const expensesAPIPackage = new APIPackage("expenses");
export const projectsAPIPackage = new APIPackage("projects");
export const purchaseQuotationsAPIPackage = new APIPackage("purchase-quotations");

export const getUnitsList = async (token) => {
  try {
    const res = await apiClient.get("/units/", {
      headers: {
        Authorization: token,
      },
    });

    if (res.status === 200) {
      return res.data;
    }

    console.log("There was an error fetching the unit list.");
    return [];
  } catch (error) {
    console.log("There was an error fetching the unit list: ", error);
    return [];
  }
};

export const getCitiesList = async (token) => {
  try {
    const res = await apiClient.get("/cities/", {
      headers: {
        Authorization: token,
      },
    });

    if (res.status === 200) {
      return res.data;
    }

    console.log("There was an error fetching cities.");
    return [];
  } catch (error) {
    console.log("There was an error fetching cities: ", error);
    return [];
  }
};

export const getLocationsList = async (token) => {
  try {
    const res = await apiClient.get("/locations/", {
      headers: {
        Authorization: token,
      },
    });

    if (res.status === 200) {
      return res.data;
    }

    console.log("There was an error fetching the locations list.");
    return [];
  } catch (error) {
    console.log("There was an error fetching the locations list: ", error);
    return [];
  }
};

export const login = async (creds) => {
  try {
    const res = await apiClient.post("/auth/jwt/create/", creds);
    if (res.status === 200) {
      return `JWT ${res.data.access}`;
    }

    return null;
  } catch (error) {
    console.log(error);
    return null;
  }
};

/**
 * Asks the backend to email a reset link.
 *
 * PASSWORD_RESET_SHOW_EMAIL_NOT_FOUND is on, so djoser answers 400 for an
 * address it does not know. That is passed back rather than swallowed, so a
 * mistyped email is told it was mistyped instead of being left waiting for
 * an email that will never arrive.
 */
export const requestPasswordReset = async (email) => {
  try {
    const res = await apiClient.post("/auth/users/reset_password/", { email });
    return { success: res.status === 204 || res.status === 200 };
  } catch (error) {
    console.log(error);
    const data = error.response?.data;
    return {
      success: false,
      notFound: data?.email?.[0]?.code === "email_not_found" ||
        /does not exist/i.test(data?.email?.[0] || ""),
    };
  }
};

/**
 * Completes the reset. Returns true, or the field errors djoser sent back so
 * the screen can show why the password was rejected.
 */
export const confirmPasswordReset = async (uid, token, password) => {
  try {
    const res = await apiClient.post("/auth/users/reset_password_confirm/", {
      uid,
      token,
      new_password: password,
      re_new_password: password,
    });
    return { success: res.status === 204 || res.status === 200 };
  } catch (error) {
    console.log(error);
    return { success: false, errors: error.response?.data || null };
  }
};

export const register = async (data) => {
  try {
    const res = await apiClient.post("/auth/users/", data);
    if (res.status === 200 || res.status == 201) {
      return true;
    }
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const getActiveBusiness = async (token) => {
  try {
    const res = await apiClient.get("/business/", {
      headers: {
        Authorization: token,
      },
    })
    
    if (res.status === 200) {
      const active_business = res.data.filter((item) => item.is_active);
      if (active_business.length > 0) {
        return active_business[0]
      }

      return null;
    }
    return null;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const getUserInfo = async (token) => {
  try {
    const res = await apiClient.get("/auth/users/me/", {
      headers: {
        Authorization: token,
      },
    });

    if (res.status === 200) {
      return res.data;
    }
    return null;
  } catch (error) {
    console.log(error);
    return null;
  }
};

// Supplier Endpoints

export const suppliersAPIPackage = new APIPackage("suppliers");

// Product Endpoints

export const productsAPIPackage = new APIPackage("products");

export const getProductsList = async (
  token,
  searchQuery = null,
  is_formatted = false,
) => {
  try {
    const res = await apiClient.get(
      `/products/${searchQuery ? searchQuery : ""}`,
      {
        headers: {
          Authorization: token,
        },
      },
    );

    if (res.status === 200) {
      if (is_formatted) {
        return res.data.map(transformProduct);
      }
      return res.data;
    }

    console.log("There was an error fetching the product list.");
    return [];
  } catch (error) {
    console.log("There was an error fetching the product list: ", error);
    return [];
  }
};

export const getAvailableProductsList = async (token, businessId) => {
  try {
    const res = await apiClient.get(
      `/inventory/${businessId}/items/get_available_items/`,
      {
        headers: {
          Authorization: token,
        },
      },
    );

    if (res.status === 200) {
      console.log(res.data);
      return res.data;
    }

    console.log("There was an error fetching the product list.");
    return [];
  } catch (error) {
    console.log("There was an error fetching the product list: ", error);
    return [];
  }
};

export const getProductVariantTypesList = async (token) => {
  try {
    const res = await apiClient.get(`/product-variant-types/`, {
      headers: {
        Authorization: token,
      },
    });

    if (res.status === 200) {
      return res.data;
    }

    console.log("There was an error fetching the product variants list.");
    return [];
  } catch (error) {
    console.log(
      "There was an error fetching the product variants list: ",
      error,
    );
    return [];
  }
};

export const getProductDetail = async (token, productId) => {
  try {
    const res = await apiClient.get(`/products/${productId}/`, {
      headers: {
        Authorization: token,
      },
    });
    if (res.status === 200) {
      return res.data;
    }
    console.log("There was an error fetching customer details.");
    return null;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const postProduct = async (token, productData) => {
  try {
    const res = await apiClient.post("/products/", productData, {
      headers: {
        Authorization: token,
      },
    });

    if (res.status === 201) {
      return true;
    }
    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log("There was an error creating the product: ", error);
    return false;
  }
};

export const updateProduct = async (token, productId, productData) => {
  try {
    const res = await apiClient.put(`/products/${productId}/`, productData, {
      headers: {
        Authorization: token,
      },
    });
    if (res.status === 200) {
      return true;
    }
    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const deleteProduct = async (token, productId) => {
  try {
    const res = await apiClient.delete(`/products/${productId}/`, {
      headers: {
        Authorization: token,
      },
    });

    if (res.status === 204) {
      return true;
    }

    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log("There was an error deleting the product: ", error);
    return false;
  }
};

export const bulkDeleteProducts = async (token, productIds) => {
  try {
    const res = await apiClient.post(
      "/products/bulk-delete/",
      { product_ids: productIds },
      {
        headers: {
          Authorization: token,
        },
      },
    );
    if (res.status === 200) {
      return true;
    }

    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log("There was an error deleting products: ", error);
    return false;
  }
};

/**
 * @param searchQuery optional query string, e.g. "?has_inventory_item=false"
 *   for variants that are not stocked yet. Defaults to the full list, so the
 *   existing callers are unaffected.
 */
export const getProductVariantsList = async (token, searchQuery = null) => {
  try {
    const res = await apiClient.get(
      `/product-variants/${searchQuery ? searchQuery : ""}`,
      {
        headers: {
          Authorization: token,
        },
      },
    );

    if (res.status === 200) {
      return res.data.map(transformProductVariant);
    }

    console.log("There was an error fetching the product list.");
    return [];
  } catch (error) {
    console.log("There was an error fetching the product list: ", error);
    return [];
  }
};

export const postProductAndVariants = async (token, productData) => {
  try {
    const res = await apiClient.post(
      "/products/create-with-variants/",
      productData,
      {
        headers: {
          Authorization: token,
        },
      },
    );
    if (res.status === 201) {
      return true;
    }
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const updateProductAndVariants = async (
  token,
  productId,
  productData,
) => {
  try {
    const res = await apiClient.post(
      `/products/${productId}/update-with-variants/`,
      productData,
      {
        headers: {
          Authorization: token,
        },
      },
    );
    if (res.status === 201) {
      return true;
    }
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

// Customers Endpoints

export const postCustomer = async (token, customerData) => {
  try {
    const res = await apiClient.post("/customers/", customerData, {
      headers: {
        Authorization: token,
      },
    });

    if (res.status === 201) {
      return true;
    }
    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log("There was an error creating the customer: ", error);
    return false;
  }
};

export const getCustomersList = async (token, searchQuery = null) => {
  try {
    const res = await apiClient.get(
      `/customers/${searchQuery ? searchQuery : ""}`,
      {
        headers: {
          Authorization: token,
        },
      },
    );
    if (res.status === 200) {
      return res.data;
    }
    console.log("There was an error fetching customers.");
  } catch (error) {
    console.log(error);
  }
};

export const getCustomerDetail = async (token, customerId) => {
  try {
    const res = await apiClient.get(`/customers/${customerId}/`, {
      headers: {
        Authorization: token,
      },
    });
    if (res.status === 200) {
      return res.data;
    }
    console.log("There was an error fetching customer details.");
    return null;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const updateCustomer = async (token, customerId, customerData) => {
  try {
    const res = await apiClient.put(`/customers/${customerId}/`, customerData, {
      headers: {
        Authorization: token,
      },
    });
    if (res.status === 200) {
      return true;
    }
    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const deleteCustomer = async (token, customerId) => {
  try {
    const res = await apiClient.delete(`/customers/${customerId}/`, {
      headers: {
        Authorization: token,
      },
    });

    if (res.status === 204) {
      return true;
    }

    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log("There was an error deleting the customer: ", error);
    return false;
  }
};

export const bulkDeleteCustomers = async (token, customerIds) => {
  try {
    const res = await apiClient.post(
      "/customers/bulk-delete/",
      { customer_ids: customerIds },
      {
        headers: {
          Authorization: token,
        },
      },
    );
    if (res.status === 200) {
      return true;
    }

    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log("There was an error deleting customers: ", error);
    return false;
  }
};

// Sales Invoice Endpoints

export const getSalesInvoiceList = async (token, searchQuery = null) => {
  try {
    const res = await apiClient.get(
      `/sales-invoices/${searchQuery ? searchQuery : ""}`,
      {
        headers: {
          Authorization: token,
        },
      },
    );
    if (res.status === 200) {
      return res.data.map(transformSalesInvoice);
    }
    console.log("There was an error fetching sales invoices.");
  } catch (error) {
    console.log(error);
  }
};

export const getSalesInvoiceDetail = async (token, invoiceId) => {
  try {
    const res = await apiClient.get(`/sales-invoices/${invoiceId}/`, {
      headers: {
        Authorization: token,
      },
    });
    if (res.status === 200) {
      return res.data;
    }
    return null;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const postSalesInvoice = async (token, invoiceData) => {
  try {
    const res = await apiClient.post("/sales-invoices/", invoiceData, {
      headers: {
        Authorization: token,
      },
    });

    if (res.status === 201) {
      return true;
    }

    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const postSalesInvoiceItem = async (token, invoiceId, itemData) => {
  try {
    const res = await apiClient.post(
      `/sales-invoices/${invoiceId}/items/`,
      itemData,
      {
        headers: {
          Authorization: token,
        },
      },
    );

    if (res.status === 201) {
      return true;
    }

    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const postSalesInvoiceAndItems = async (token, invoiceData) => {
  try {
    const res = await apiClient.post(
      "/sales-invoices/create-with-items/",
      invoiceData,
      {
        headers: {
          Authorization: token,
        },
      },
    );
    // The created invoice rather than `true`: still truthy for the callers
    // that only test it, and it carries the id a create screen needs to attach
    // the images and payments held on screen until now.
    if (res.status === 201) {
      return res.data;
    }
    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const deleteSalesInvoice = async (token, invoiceId) => {
  try {
    const res = await apiClient.delete(`/sales-invoices/${invoiceId}/`, {
      headers: {
        Authorization: token,
      },
    });

    if (res.status === 204) {
      return true;
    }

    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const updateSalesInvoiceAndItems = async (
  token,
  invoiceId,
  invoiceData,
) => {
  try {
    const res = await apiClient.post(
      `/sales-invoices/${invoiceId}/update-with-items/`,
      invoiceData,
      {
        headers: {
          Authorization: token,
        },
      },
    );

    if (res.status === 200) {
      return true;
    }

    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

// Cancelling is the one status transition a person makes - every other value
// is derived from the invoice's lines and what is still owed - so it is an
// action rather than a field on the form. The backend returns the goods to
// stock on cancel and takes them out again on uncancel.
export const cancelSalesInvoice = async (token, invoiceId) => {
  try {
    const res = await apiClient.post(
      `/sales-invoices/${invoiceId}/cancel/`,
      {},
      {
        headers: {
          Authorization: token,
        },
      },
    );

    if (res.status === 200) {
      return true;
    }

    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const uncancelSalesInvoice = async (token, invoiceId) => {
  try {
    const res = await apiClient.post(
      `/sales-invoices/${invoiceId}/uncancel/`,
      {},
      {
        headers: {
          Authorization: token,
        },
      },
    );

    if (res.status === 200) {
      return true;
    }

    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const deleteProjectSalesInvoice = async (token, projectId, projectSalesInvoiceId) => {
  try {
    const res = await apiClient.delete(`/projects/${projectId}/sales-invoices/${projectSalesInvoiceId}/`, {
      headers: {
        Authorization: token,
      },
    });

    if (res.status === 204) {
      return true;
    }

    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const deleteProjectPurchaseInvoice = async (token, projectId, projectPurchaseInvoiceId) => {
  try {
    const res = await apiClient.delete(`/projects/${projectId}/purchase-invoices/${projectPurchaseInvoiceId}/`, {
      headers: {
        Authorization: token,
      },
    });

    if (res.status === 204) {
      return true;
    }

    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const bulkDeleteSalesInvoice = async (token, invoiceIds) => {
  try {
    const res = await apiClient.post(
      "/sales-invoices/bulk-delete/",
      { invoice_ids: invoiceIds },
      {
        headers: {
          Authorization: token,
        },
      },
    );

    if (res.status === 200) {
      return true;
    }

    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const returnSalesInvoiceItem = async (
  token,
  invoiceId,
  itemId,
  quantity,
  reason,
) => {
  try {
    const res = await apiClient.post(
      `sales-invoices/${invoiceId}/items/${itemId}/return/`,
      {
        quantity: quantity,
        reason: reason,
      },
      {
        headers: {
          Authorization: token,
        },
      },
    );

    if (res.status == 200) {
      return true;
    } else {
      console.log("error returning item.");
      return false;
    }
  } catch (error) {
    console.log("error returning item: ", error);
    return false;
  }
};

// Purchase Invoice Endpoints

export const getPurchaseInvoiceList = async (token, searchQuery = null) => {
  try {
    const res = await apiClient.get(
      `/purchase-invoices/${searchQuery ? searchQuery : ""}`,
      {
        headers: {
          Authorization: token,
        },
      },
    );
    if (res.status === 200) {
      console.log(res.data);
      return res.data.map(transformPurchaseInvoice);
    }
    console.log("There was an error fetching purchase invoices.");
  } catch (error) {
    console.log(error);
  }
};

export const getPurchaseInvoiceDetail = async (token, invoiceId) => {
  try {
    const res = await apiClient.get(`/purchase-invoices/${invoiceId}/`, {
      headers: {
        Authorization: token,
      },
    });
    if (res.status === 200) {
      return res.data;
    }
    console.log("There was an error fetching purchase invoice details.");
    return null;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const postPurchaseInvoiceAndItems = async (token, invoiceData) => {
  try {
    const res = await apiClient.post(
      "/purchase-invoices/create-with-items/",
      invoiceData,
      {
        headers: {
          Authorization: token,
        },
      },
    );
    // The created invoice rather than `true`: still truthy for the callers
    // that only test it, and it carries the id a create screen needs to attach
    // the images and payments held on screen until now.
    if (res.status === 201) {
      return res.data;
    }
    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const updatePurchaseInvoiceAndItems = async (
  token,
  invoiceId,
  invoiceData,
) => {
  try {
    const res = await apiClient.post(
      `/purchase-invoices/${invoiceId}/update-with-items/`,
      invoiceData,
      {
        headers: {
          Authorization: token,
        },
      },
    );
    if (res.status === 200) {
      return res.data;
    }
    console.log(res.data.detail);
    return null;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const deletePurchaseInvoice = async (token, invoiceId) => {
  try {
    const res = await apiClient.delete(`/purchase-invoices/${invoiceId}/`, {
      headers: {
        Authorization: token,
      },
    });
    if (res.status === 204) {
      return true;
    }

    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const bulkDeletePurchaseInvoice = async (token, invoiceIds) => {
  try {
    const res = await apiClient.post(
      "/purchase-invoices/bulk-delete/",
      { invoice_ids: invoiceIds },
      {
        headers: {
          Authorization: token,
        },
      },
    );
    if (res.status === 200) {
      return true;
    }
    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

// Inventory Item Endpoints

export const getInventoryItemList = async (
  token,
  businessId,
  searchQuery = null,
) => {
  try {
    const res = await apiClient.get(
      `/inventory/${businessId}/items/${searchQuery ? searchQuery : ""}`,
      {
        headers: {
          Authorization: token,
        },
      },
    );
    if (res.status === 200) {
      return res.data.map(transformInventoryItem);
    }
    console.log("Error fetching the inventory items.");
    return null;
  } catch (error) {
    console.log("Error fetching the inventory items: ", error);
    return null;
  }
};

export const getInventoryItemDetail = async (token, businessId, itemId) => {
  try {
    const res = await apiClient.get(
      `/inventory/${businessId}/items/${itemId}/`,
      {
        headers: {
          Authorization: token,
        },
      },
    );
    if (res.status === 200) {
      return res.data;
    }
    console.log("Error fetching the inventory item details.");
    return null;
  } catch (error) {
    console.log("Error fetching the inventory item details: ", error);
    return null;
  }
};

export const postInventoryItem = async (token, businessId, itemData) => {
  try {
    const res = await apiClient.post(
      `/inventory/${businessId}/items/`,
      itemData,
      {
        headers: {
          Authorization: token,
        },
      },
    );
    if (res.status === 201) {
      return true;
    }
    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const updateInventoryItem = async (
  token,
  businessId,
  itemId,
  itemData,
) => {
  try {
    const res = await apiClient.put(
      `/inventory/${businessId}/items/${itemId}/`,
      itemData,
      {
        headers: {
          Authorization: token,
        },
      },
    );
    if (res.status === 200) {
      return true;
    }
    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const deleteInventoryItem = async (token, businessId, itemId) => {
  try {
    const res = await apiClient.delete(
      `/inventory/${businessId}/items/${itemId}/`,
      {
        headers: {
          Authorization: token,
        },
      },
    );
    if (res.status === 204) {
      return true;
    }
    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const bulkDeleteInventoryItems = async (token, businessId, itemIds) => {
  try {
    const res = await apiClient.post(
      `/inventory/${businessId}/items/bulk-delete/`,
      { item_ids: itemIds },
      {
        headers: {
          Authorization: token,
        },
      },
    );
    if (res.status === 200) {
      return true;
    }
    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

// Returned Items Endpoints

export const returnedItemsAPIPackage = new APIPackage("returned-items");

export const returnReturnedItemToSalesInvoice = async (token, itemId) => {
  try {
    const res = await apiClient.post(
      `/returned-items/${itemId}/sales-invoice-return/`,
      null,
      {
        headers: {
          Authorization: token,
        },
      },
    );
    if (res.status === 200) {
      return true;
    }
    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const returnReturnedItemToInventory = async (token, itemId) => {
  try {
    const res = await apiClient.post(
      `/returned-items/${itemId}/inventory-return/`,
      null,
      {
        headers: {
          Authorization: token,
        },
      },
    );
    if (res.status === 200) {
      return true;
    }
    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

// Purchase Quotations Endpoints

export const postPurchaseQuotationAndItems = async (token, quotationData) => {
  try {
    const res = await apiClient.post(
      "/purchase-quotations/create-with-items/",
      quotationData,
      {
        headers: {
          Authorization: token,
        },
      },
    );
    if (res.status === 201) {
      return true;
    }
    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const updatePurchaseQuotationAndItems = async (
  token,
  quotationId,
  quotationData,
) => {
  try {
    const res = await apiClient.post(
      `/purchase-quotations/${quotationId}/update-with-items/`,
      quotationData,
      {
        headers: {
          Authorization: token,
        },
      },
    );
    if (res.status === 200) {
      return res.data;
    }
    console.log(res.data.detail);
    return null;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const ToggleQuotationItemFulfillment = async (
  token,
  quotationId,
  itemId,
) => {
  try {
    const res = await apiClient.get(
      `/purchase-quotations/${quotationId}/items/${itemId}/toggle-fulfillment/`,
      {
        headers: {
          Authorization: token,
        },
      },
    );
    if (res.status === 200) {
      return true;
    }
    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const DeleteQuotationItem = async (token, quotationId, itemId) => {
  try {
    const res = await apiClient.delete(
      `/purchase-quotations/${quotationId}/items/${itemId}/`,
      {
        headers: {
          Authorization: token,
        },
      },
    );
    if (res.status === 204) {
      return true;
    }
    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

// Projects Endpoints

export const createCompleteProject = async (token, data) => {
  try {
    const res = await apiClient.post("projects/complete-creation/", data, {
      headers: {
        Authorization: token,
      },
    });

    if (res.status === 201) {
      return true;
    }

    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const CreateTask = async (token, projectId, data) => {
  try {
    const res = await apiClient.post(
      `/projects/${projectId}/tasks/`,
      data,
      {
        headers: {
          Authorization: token,
        },
      },
    );
    if (res.status === 201) {
      return true;
    }
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const UpdateTask = async (token, projectId, taskId, data) => {
  try {
    const res = await apiClient.put(
      `/projects/${projectId}/tasks/${taskId}/`,
      data,
      {
        headers: {
          Authorization: token,
        },
      },
    );
    if (res.status === 200) {
      return true;
    }
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const GetTaskDetail = async (token, projectId, taskId) => {
  try {
    const res = await apiClient.get(
      `/projects/${projectId}/tasks/${taskId}/`,
      {
        headers: {
          Authorization: token,
        },
      },
    );
    if (res.status === 200) {
      return res.data;
    }
    return null;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const ToggleProjectTaskCompletion = async (token, projectId, taskId) => {
  try {
    const res = await apiClient.get(
      `/projects/${projectId}/tasks/${taskId}/toggle-completion/`,
      {
        headers: {
          Authorization: token,
        },
      },
    );
    if (res.status === 200) {
      return true;
    }
    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const DeleteTask = async (token, projectId, taskId) => {
  try {
    const res = await apiClient.delete(
      `/projects/${projectId}/tasks/${taskId}/`,
      {
        headers: {
          Authorization: token,
        },
      },
    );
    if (res.status === 204) {
      return true;
    }
    console.log(res.data.detail);
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
}


// General Endpoints

// The header's search: { query, groups: [{ type, label, total, hits, breakdown? }] },
// only the groups that matched and only the types this user may see.
// Null on failure, so the box can say so rather than claim "no results".
export const globalSearch = async (token, query) => {
  try {
    const res = await apiClient.get("global-search/", {
      params: { q: query },
      headers: {
        Authorization: token,
      },
    });
    if (res.status == 200) {
      return res.data;
    }
    return null;
  } catch (error) {
    console.log("error performing search", error);
    return null;
  }
};

// INVENTORY METRICS

export const getTotalInventoryValue = async (token) => {
  try {
    const res = await apiClient.get("inventory-kpis/total-inventory-value/", {
      headers: {
        Authorization: token,
      },
    });

    if (res.status == 200) {
      return res.data.total_inventory_value;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const getTotalInventoryValueWithProfit = async (token) => {
  try {
    const res = await apiClient.get(
      "inventory-kpis/total-inventory-value-with-profit/",
      {
        headers: {
          Authorization: token,
        },
      }
    );

    if (res.status == 200) {
      return res.data.total_inventory_value_with_profit;
    }

    return null;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const getTotalItemsNotInInventory = async (token) => {
  try {
    const res = await apiClient.get(
      "inventory-kpis/total-items-not-in-inventory/",
      {
        headers: {
          Authorization: token,
        },
      }
    );

    if (res.status == 200) {
      return res.data.items_not_in_inventory;
    }

    return null;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const getTotalRestocksReq = async (token) => {
  try {
    const res = await apiClient.get("inventory-kpis/total-restocks-required/", {
      headers: {
        Authorization: token,
      },
    });

    if (res.status == 200) {
      return res.data.restocks_req;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
};

// SUPPLIER METRICS

export const getTotalSuppliers = async (token) => {
  try {
    const res = await apiClient.get("supplier-kpis/total-suppliers/", {
      headers: {
        Authorization: token,
      },
    });

    if (res.status == 200) {
      return res.data.total_suppliers;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
};

// CUSTOMER METRICS

export const getTotalCustomers = async (token) => {
  try {
    const res = await apiClient.get("customer-kpis/total-customers/", {
      headers: {
        Authorization: token,
      },
    });

    if (res.status == 200) {
      return res.data.total_customers;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
};

// PRODUCT METRICS

export const getTotalProducts = async (token) => {
  try {
    const res = await apiClient.get("product-kpis/total-products/", {
      headers: {
        Authorization: token,
      },
    });

    if (res.status == 200) {
      return res.data.total_products;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
};

// LOCATION METRICS

export const getTotalLocations = async (token) => {
  try {
    const res = await apiClient.get("location-kpis/total-locations/", {
      headers: {
        Authorization: token,
      },
    });

    if (res.status == 200) {
      return res.data.total_locations;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
};

//SALES METRICS

export const getTotalSalesDaily = async (token) => {
  try {
    const res = await apiClient.get("sales-kpis/daily-total-sales/", {
      headers: {
        Authorization: token,
      },
    });

    if (res.status == 200) {
      return res.data.total_daily_sales;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const getTotalItemsSoldDaily = async (token) => {
  try {
    const res = await apiClient.get("sales-kpis/daily-total-items/", {
      headers: {
        Authorization: token,
      },
    });

    if (res.status == 200) {
      return res.data.total_items;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const getTotalSalesInvoicesDaily = async (token) => {
  try {
    const res = await apiClient.get("sales-kpis/daily-total-sales-invoices/", {
      headers: {
        Authorization: token,
      },
    });

    if (res.status == 200) {
      return res.data.total_invoices;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const getRecentSales = async (token) => {
  try {
    const res = await apiClient.get("sales-kpis/recent-sales/", {
      headers: {
        Authorization: token,
      },
    });

    if (res.status == 200) {
      return res.data.recent_sales;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const getMonthlySalesTrend = async (token) => {
  try {
    const res = await apiClient.get("sales-kpis/monthly-sales-trend/", {
      headers: {
        Authorization: token,
      },
    });

    if (res.status == 200) {
      return res.data.monthly_sales_trend;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const getAvgOrderValue = async (token) => {
  try {
    const res = await apiClient.get("sales-kpis/average-order-value/", {
      headers: {
        Authorization: token,
      },
    });

    if (res.status == 200) {
      return res.data.avg_order_value;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
};

// PURCHASES METRICS
export const getTotalPurchases = async (token) => {
  try {
    const res = await apiClient.get("purchases-kpis/total-purchases/", {
      headers: {
        Authorization: token,
      },
    });

    if (res.status == 200) {
      return res.data.total_purchases;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const getTotalPurchasesMonthly = async (token) => {
  try {
    const res = await apiClient.get("purchases-kpis/monthly-total-purchases/", {
      headers: {
        Authorization: token,
      },
    });

    if (res.status == 200) {
      return res.data.total_purchases;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const getTotalPendingPurchaseInvoices = async (token) => {
  try {
    const res = await apiClient.get("purchases-kpis/total-pending-invoices/", {
      headers: {
        Authorization: token,
      },
    });

    if (res.status == 200) {
      return res.data.total_invoices;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const getTotalPurchaseInvoicesMonthly = async (token) => {
  try {
    const res = await apiClient.get(
      "purchases-kpis/monthly-total-purchase-invoices/",
      {
        headers: {
          Authorization: token,
        },
      },
    );

    if (res.status == 200) {
      return res.data.total_invoices;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const getTotalPendingPayment = async (token) => {
  try {
    const res = await apiClient.get("purchases-kpis/total-pending-payment/", {
      headers: {
        Authorization: token,
      },
    });

    if (res.status == 200) {
      return res.data.total_payment;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const getInvoiceWhatsAppMessage = async (token, invoiceId) => {
  try {
    const res = await apiClient.get(
      `sales-invoices/${invoiceId}/whatsapp-message/`,
      {
        headers: {
          Authorization: token,
        },
      },
    );

    if (res.status === 200) {
      return res.data;
    }
    return null;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const getInvoicePDFData = async (token, invoiceId) => {
  try {
    const res = await apiClient.get(
      `sales-invoices/${invoiceId}/print-invoice/`,
      {
        headers: {
          Authorization: token,
        },
      },
    );

    if (res.status == 200) {
      return res.data;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
};

// RETURNED ITEMS METRICS

export const getTotalReturnedItems = async (token) => {
  try {
    const res = await apiClient.get(
      "returned-items-kpis/total-returned-items/",
      {
        headers: {
          Authorization: token,
        },
      },
    );

    if (res.status == 200) {
      return res.data.total_returned_items;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
};

// SUPPLIER METRICS

// EXPENSES METRICS

export const getTotalExpensesMonthly = async (token) => {
  try {
    const res = await apiClient.get("expenses-kpis/monthly-total-expenses/", {
      headers: {
        Authorization: token,
      },
    });

    if (res.status == 200) {
      return res.data.monthly_total_expenses;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const getTotalExpenseAmountMonthly = async (token) => {
  try {
    const res = await apiClient.get(
      "expenses-kpis/monthly-total-expense-amount/",
      {
        headers: {
          Authorization: token,
        },
      },
    );

    if (res.status == 200) {
      return res.data.monthly_total_expense_amount;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const getMonthlyExpensesTrend = async (token) => {
  try {
    const res = await apiClient.get("expenses-kpis/monthly-expenses-trend/", {
      headers: {
        Authorization: token,
      },
    });

    if (res.status == 200) {
      return res.data.monthly_expenses_trend;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
};


// ---------------------------------------------------------------------------
// RBAC — Access Config
// ---------------------------------------------------------------------------

export const getAccessConfig = async (token, businessId) => {
  try {
    const res = await apiClient.get(`auth/access-config/?business_id=${businessId}`, {
      headers: { Authorization: token },
    });
    if (res.status === 200) return res.data;
    return null;
  } catch (error) {
    console.log("Error fetching access config:", error);
    return null;
  }
};

export const getBusinessConfig = async (token, businessId) => {
  try {
    const res = await apiClient.get(`business/${businessId}/config/`, {
      headers: { Authorization: token },
    });
    if (res.status === 200) return res.data;
    return null;
  } catch (error) {
    console.log("Error fetching business config:", error);
    return null;
  }
};


// ---------------------------------------------------------------------------
// RBAC — Employee Management (admin only)
// ---------------------------------------------------------------------------

export const getEmployeesList = async (token, businessId) => {
  try {
    const res = await apiClient.get(`business/${businessId}/employees/`, {
      headers: { Authorization: token },
    });
    if (res.status === 200) return res.data;
    return null;
  } catch (error) {
    console.log("Error fetching employees:", error);
    return null;
  }
};

export const createEmployee = async (token, businessId, data) => {
  console.log('createEmployee running...')
  try {
    const res = await apiClient.post(`business/${businessId}/employees/create-with-user/`, data, {
      headers: { Authorization: token },
    });

    console.log(res)

    if (res.status === 201) return true;
    return false;
  } catch (error) {
    console.log("Error creating employee:", error);
    return false;
  }
};

export const updateEmployee = async (token, businessId, employeeId, data) => {
  try {
    console.log(data)
    const res = await apiClient.put(`business/${businessId}/employees/${employeeId}/`, data, {
      headers: { Authorization: token },
    });
    if (res.status === 200) return true;
    return false;
  } catch (error) {
    console.log("Error updating employee:", error);
    return false;
  }
};

export const deleteEmployee = async (token, businessId, employeeId) => {
  try {
    const res = await apiClient.delete(`business/${businessId}/employees/${employeeId}/`, {
      headers: { Authorization: token },
    });
    if (res.status === 204) return true;
    return false;
  } catch (error) {
    console.log("Error deleting employee:", error);
    return false;
  }
};

/**
 * What the khaata settles onto one invoice, and the totals the payments dialog
 * works from: paid (own payments + khaata), still owed, the room one more
 * payment may take, and the khaata lines (credit notes, on-account money).
 * Returns null on failure.
 */
export const getInvoiceSettlement = async (token, invoiceId, is_sales_payment) => {
  try {
    const res = await apiClient.get(
      `${is_sales_payment ? 'sales' : 'purchase'}-invoices/${invoiceId}/settlement/`,
      { headers: { Authorization: token } },
    );
    return res.status === 200 ? res.data : null;
  } catch (error) {
    console.log("Error fetching invoice settlement:", error);
    return null;
  }
};

export const getPaymentsList = async (token, invoiceId, is_sales_payment) => {
  try {
    const res = await apiClient.get(`${is_sales_payment? 'sales': 'purchase'}-invoices/${invoiceId}/payments/`, {
      headers: { Authorization: token },
    })

    if (res.status !== 200){
      console.log("Error fetching payments")
      return false
    }

    return res.data
  } catch (error) {
    console.log("Error fetching payments")
    return false;
  }
}

// The request body for one payment. A plain object, or FormData when a photo
// of the slip or cheque comes with it - a file only travels as multipart. Used
// by the payments dialog and by attachStagedToInvoice, so a payment recorded
// straight away and one held until its invoice exists are sent identically.
export const paymentRequestBody = (fields, imageFile) => {
  if (!imageFile) return fields;
  const body = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      body.append(key, value);
    }
  });
  body.append("image", imageFile);
  return body;
};

// Sends what a create screen held on screen while the invoice did not exist:
// its payments, then its images, all against the new invoice's id.
//
// One at a time, not in parallel: the server checks each payment against what
// is still owed, and that figure depends on the payments before it.
//
// Never throws. The invoice is already created by the time this runs, so a
// failure here is reported as a count, and the caller says "created, but".
export const attachStagedToInvoice = async (
  token,
  invoiceId,
  is_sales_invoice,
  { payments = [], images = [] },
) => {
  let paymentFailures = 0;
  let imageFailures = 0;

  for (const payment of payments) {
    try {
      const ok = await createPayment(
        token,
        invoiceId,
        is_sales_invoice,
        paymentRequestBody(payment.fields, payment.imageFile),
      );
      if (!ok) paymentFailures += 1;
    } catch (error) {
      console.log("Error attaching a payment:", error);
      paymentFailures += 1;
    }
  }

  for (const image of images) {
    try {
      const formData = new FormData();
      formData.append("image", image.file);
      if (image.caption) formData.append("caption", image.caption);
      const ok = await uploadInvoiceImage(token, invoiceId, is_sales_invoice, formData);
      if (!ok) imageFailures += 1;
    } catch (error) {
      console.log("Error attaching an image:", error);
      imageFailures += 1;
    }
  }

  return { paymentFailures, imageFailures };
};

// An invoice carries several photos - the signed delivery note, the goods as
// they arrived, the supplier's own bill. Nested under the invoice, so which
// one an image belongs to never travels in the payload.
export const getInvoiceImages = async (token, invoiceId, is_sales_invoice) => {
  try {
    const res = await apiClient.get(
      `${is_sales_invoice ? "sales" : "purchase"}-invoices/${invoiceId}/images/`,
      { headers: { Authorization: token } },
    );

    if (res.status !== 200) {
      console.log("Error fetching invoice images");
      return null;
    }

    return res.data;
  } catch (error) {
    console.log("Error fetching invoice images:", error);
    return null;
  }
};

export const uploadInvoiceImage = async (token, invoiceId, is_sales_invoice, formData) => {
  try {
    const res = await apiClient.post(
      `${is_sales_invoice ? "sales" : "purchase"}-invoices/${invoiceId}/images/`,
      formData,
      {
        headers: {
          Authorization: token,
          "Content-Type": "multipart/form-data",
        },
      },
    );

    if (res.status === 201) return true;

    console.log("Error uploading invoice image.");
    return false;
  } catch (error) {
    console.log("Error uploading invoice image:", error);
    return false;
  }
};

export const deleteInvoiceImage = async (token, invoiceId, is_sales_invoice, imageId) => {
  try {
    const res = await apiClient.delete(
      `${is_sales_invoice ? "sales" : "purchase"}-invoices/${invoiceId}/images/${imageId}/`,
      { headers: { Authorization: token } },
    );

    if (res.status === 204) return true;

    console.log("Error deleting invoice image.");
    return false;
  } catch (error) {
    console.log("Error deleting invoice image:", error);
    return false;
  }
};

// `data` may be a plain object or a FormData. A payment can carry a photo of
// the slip or the cheque, and a file only reaches the server as multipart -
// but the dialog sends a plain object when there is no photo, which keeps the
// numbers typed rather than stringified.
export const createPayment = async (token, invoiceId, is_sales_payment, data) => {
  try {
    const isMultipart = typeof FormData !== "undefined" && data instanceof FormData;
    const res = await apiClient.post(`${is_sales_payment? 'sales': 'purchase'}-invoices/${invoiceId}/payments/`, data, {
      headers: isMultipart
        ? { Authorization: token, "Content-Type": "multipart/form-data" }
        : { Authorization: token },
    });
    if (res.status === 201) return true;
    console.log("Error creating payment.");
    return false;
  } catch (error) {
    console.log("Error creating payment:", error);
    return false;
  }
};

export const updatePayment = async (token, invoiceId, is_sales_payment, paymentId, data) => {
  try {
    const res = await apiClient.put(`${is_sales_payment? 'sales': 'purchase'}-invoices/${invoiceId}/payments/${paymentId}/`, data, {
      headers: { Authorization: token },
    });
    if (res.status === 200) return true;
    console.log("Error updating payment.");
    return false;
  } catch (error) {
    console.log("Error updating payment:", error);
    return false;
  }
};

export const deletePayment = async (token, invoiceId, is_sales_payment, paymentId) => {
  try {
    const res = await apiClient.delete(`${is_sales_payment? 'sales': 'purchase'}-invoices/${invoiceId}/payments/${paymentId}/`, {
      headers: { Authorization: token },
    });
    if (res.status === 204) return true;
    console.log("Error deleting payment.");
    return false;
  } catch (error) {
    console.log("Error deleting payment:", error);
    return false;
  }
};

// Deletes one of an invoice's automatic refunds (recorded when an update left
// it paid for more than it bills). The excess then stays with the party, as
// credit on their khaata.
export const deleteInvoiceRefund = async (token, invoiceId, is_sales_invoice, transactionId) => {
  try {
    const res = await apiClient.post(
      `${is_sales_invoice ? "sales" : "purchase"}-invoices/${invoiceId}/delete-refund/`,
      { transaction_id: transactionId },
      { headers: { Authorization: token } },
    );
    if (res.status === 200) return true;
    console.log("Error deleting refund.");
    return false;
  } catch (error) {
    console.log("Error deleting refund:", error);
    return false;
  }
};

// Runs what an update screen held until Update Invoice, around the invoice's
// own update: deletions BEFORE it and new payments AFTER it. The order is the
// server's refund rule - a payment deleted first is not counted as paid when
// the update works out whether the invoice is now overpaid, and a new payment
// is checked against the updated total.
//
// `update` is the invoice update call; this returns { updated, failures },
// where failures counts the held actions that did not go through. Never
// throws.
export const applyHeldPayments = async (
  token,
  invoiceId,
  is_sales_invoice,
  held,
  update,
) => {
  let failures = 0;

  for (const payment of held.deletes || []) {
    if (!(await deletePayment(token, invoiceId, is_sales_invoice, payment.id))) failures += 1;
  }
  for (const refundId of held.refundDeletes || []) {
    if (!(await deleteInvoiceRefund(token, invoiceId, is_sales_invoice, refundId))) failures += 1;
  }

  let updated = false;
  try {
    updated = await update();
  } catch (error) {
    console.log("Error updating invoice:", error);
  }
  // Without the update, a new payment would be checked against the old
  // total, so none is sent.
  if (!updated) return { updated: false, failures };

  const { paymentFailures } = await attachStagedToInvoice(
    token, invoiceId, is_sales_invoice, { payments: held.adds || [], images: [] });

  return { updated: true, failures: failures + paymentFailures };
};

// ---------------------------------------------------------------------------
// Backlog
// ---------------------------------------------------------------------------

export const backlogEntriesAPIPackage = new APIPackage("backlog-entries");

export const createBacklogEntry = async (token, formData) => {
  try {
    const res = await apiClient.post("/backlog-entries/", formData, {
      headers: {
        Authorization: token,
        "Content-Type": "multipart/form-data",
      },
    });
    return res.status === 201;
  } catch (error) {
    console.log("Error creating backlog entry:", error);
    return false;
  }
};

export const updateBacklogEntry = async (token, id, formData) => {
  try {
    const res = await apiClient.put(`/backlog-entries/${id}/`, formData, {
      headers: {
        Authorization: token,
        "Content-Type": "multipart/form-data",
      },
    });
    return res.status === 200;
  } catch (error) {
    console.log("Error updating backlog entry:", error);
    return false;
  }
};

export const toggleBacklogEntryStatus = async (token, id) => {
  try {
    const res = await apiClient.post(`/backlog-entries/${id}/toggle-status/`, {}, {
      headers: { Authorization: token },
    });
    return res.status === 200;
  } catch (error) {
    console.log("Error toggling backlog entry status:", error);
    return false;
  }
};

// ---------------------------------------------------------------------------
// Accounting
// ---------------------------------------------------------------------------

export const moneyAccountsAPIPackage = new APIPackage("money-accounts");
export const transactionsAPIPackage = new APIPackage("transactions");
// Raw rows, unlike getSalesInvoiceList/getPurchaseInvoiceList which map through
// the display transforms and turn totals into "PKR 10,000" strings. The
// transaction screen's invoice pickers need the numbers.
export const salesInvoicesAPIPackage = new APIPackage("sales-invoices");
export const purchaseInvoicesAPIPackage = new APIPackage("purchase-invoices");
export const partyOpeningBalancesAPIPackage = new APIPackage("party-opening-balances");

/**
 * Turns a DRF error body into one line a user can act on.
 *
 * A bare boolean return meant every failure showed the same generic message,
 * so "accumulated amount cannot exceed invoice total" reached nobody.
 */
const firstFieldError = (error, fallback) => {
  if (error?.response?.status === 403) return null;   // the interceptor toasts
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;

  const firstKey = Object.keys(data)[0];
  if (!firstKey) return fallback;
  const value = data[firstKey];
  return Array.isArray(value) ? value[0] : String(value);
};

/**
 * Returns { ok, data, error }. `ok` is true only when the server answered 201
 * AND the body carries an id — the create path used to answer 201 with the
 * submitted payload echoed back for writes that never happened, so the status
 * alone is not proof a row exists.
 */
export const createTransaction = async (token, formData) => {
  try {
    const res = await apiClient.post("/transactions/", formData, {
      headers: {
        Authorization: token,
        "Content-Type": "multipart/form-data",
      },
    });
    const created = res.status === 201 && Boolean(res.data?.id);
    return {
      ok: created,
      data: res.data,
      error: created ? null : "Failed to record transaction.",
    };
  } catch (error) {
    console.log("Error creating transaction:", error);
    return {
      ok: false,
      data: null,
      error: firstFieldError(error, "Failed to record transaction."),
    };
  }
};

export const updateTransaction = async (token, id, formData) => {
  try {
    const res = await apiClient.put(`/transactions/${id}/`, formData, {
      headers: {
        Authorization: token,
        "Content-Type": "multipart/form-data",
      },
    });
    return {
      ok: res.status === 200,
      data: res.data,
      error: res.status === 200 ? null : "Failed to update transaction.",
    };
  } catch (error) {
    console.log("Error updating transaction:", error);
    return {
      ok: false,
      data: null,
      error: firstFieldError(error, "Failed to update transaction."),
    };
  }
};

export const markChequeCleared = async (token, id) => {
  try {
    const res = await apiClient.post(`/transactions/${id}/mark-cleared/`, {}, {
      headers: { Authorization: token },
    });
    return res.status === 200;
  } catch (error) {
    console.log("Error marking cheque cleared:", error);
    return false;
  }
};

export const markChequeBounced = async (token, id) => {
  try {
    const res = await apiClient.post(`/transactions/${id}/mark-bounced/`, {}, {
      headers: { Authorization: token },
    });
    return res.status === 200;
  } catch (error) {
    console.log("Error marking cheque bounced:", error);
    return false;
  }
};

export const getPendingCheques = async (token) => {
  try {
    const res = await apiClient.get("transactions/pending-cheques/", {
      headers: { Authorization: token },
    });
    if (res.status == 200) {
      return res.data;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const getCashInHand = async (token, asOf = null) => {
  try {
    const res = await apiClient.get(
      `accounting-kpis/cash-in-hand/${asOf ? `?as_of=${asOf}` : ""}`,
      { headers: { Authorization: token } }
    );
    if (res.status == 200) {
      return res.data.cash_in_hand;
    }
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const getReceivables = async (token) => {
  try {
    const res = await apiClient.get("accounting-kpis/receivables/", {
      headers: { Authorization: token },
    });
    if (res.status == 200) {
      return res.data.receivables;
    }
  } catch (error) {
    console.log(error);
    return null;
  }
};

/**
 * Parties still carrying an unsettled opening balance, with what is left on
 * it. Not the same as getPayables/getReceivables, which include invoice debt.
 * The khaata's pool (on-account payments, credit notes) settles the opening
 * balance first and then pending invoices, so "left on it" is what the pool
 * has not reached yet.
 */
export const getOpeningBalances = async (token, party = "supplier") => {
  try {
    const res = await apiClient.get(
      `accounting-kpis/opening-balances/?party=${party}`,
      { headers: { Authorization: token } },
    );
    if (res.status === 200) {
      return res.data.opening_balances;
    }
    return null;
  } catch (error) {
    console.log("Error fetching opening balances:", error);
    return null;
  }
};

/**
 * Everything one party's money could settle, oldest first: their uncleared
 * opening balance, then every invoice with room left.
 *
 * `room` here is authoritative and must NOT be recomputed on the client.
 * invoicePending() in utils.js subtracts amount_paid, which excludes pending
 * cheques, so it would offer money the server then refuses.
 */
/**
 * Set or replace a party's opening balance. PartyOpeningBalance is OneToOne
 * per party, so the party page always upserts: look for an existing row, PUT
 * it if there is one, POST if there is not.
 */
export const saveOpeningBalance = async (token, { customerId, supplierId, amount, asOfDate }) => {
  const filter = customerId ? `?customer=${customerId}` : `?supplier=${supplierId}`;
  const payload = {
    amount,
    as_of_date: asOfDate,
    ...(customerId ? { customer: customerId } : { supplier: supplierId }),
  };

  try {
    const existing = await partyOpeningBalancesAPIPackage.list(token, filter);
    const row = Array.isArray(existing) ? existing[0] : null;

    const ok = row
      ? await partyOpeningBalancesAPIPackage.update(token, row.id, payload)
      : await partyOpeningBalancesAPIPackage.create(token, payload);

    return ok;
  } catch (error) {
    console.log("Error saving opening balance:", error);
    return false;
  }
};

export const getSettleableItems = async (token, { customerId, supplierId }) => {
  try {
    const query = customerId
      ? `customer_id=${customerId}`
      : `supplier_id=${supplierId}`;
    const res = await apiClient.get(
      `accounting-kpis/settleable-items/?${query}`,
      { headers: { Authorization: token } },
    );
    if (res.status === 200) {
      return res.data;
    }
    return null;
  } catch (error) {
    console.log("Error fetching settleable items:", error);
    return null;
  }
};

/**
 * One amount against several ticked items. The server writes one transaction
 * per settled item, atomically, and answers with the rows it actually wrote —
 * so `ok` requires a non-empty list, not just a 201.
 */
export const recordPartyPayment = async (token, formData) => {
  try {
    const res = await apiClient.post("/transactions/record-payment/", formData, {
      headers: {
        Authorization: token,
        "Content-Type": "multipart/form-data",
      },
    });
    const created = res.status === 201 && Array.isArray(res.data) && res.data.length > 0;
    return {
      ok: created,
      data: res.data,
      error: created ? null : "Failed to record the payment.",
    };
  } catch (error) {
    console.log("Error recording party payment:", error);
    return {
      ok: false,
      data: null,
      error: firstFieldError(error, "Failed to record the payment."),
    };
  }
};

export const getPayables = async (token) => {
  try {
    const res = await apiClient.get("accounting-kpis/payables/", {
      headers: { Authorization: token },
    });
    if (res.status == 200) {
      return res.data.payables;
    }
  } catch (error) {
    console.log(error);
    return null;
  }
};

// `period` narrows Total Business only; the balance is always everything.
export const getCustomerSummary = async (token, customerId, period = null) => {
  try {
    const res = await apiClient.get(`/customers/${customerId}/summary/${withPeriod("", period)}`, {
      headers: { Authorization: token },
    });
    if (res.status === 200) {
      return res.data;
    }
    return null;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const getSupplierSummary = async (token, supplierId, period = null) => {
  try {
    const res = await apiClient.get(`/suppliers/${supplierId}/summary/${withPeriod("", period)}`, {
      headers: { Authorization: token },
    });
    if (res.status === 200) {
      return res.data;
    }
    return null;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const getPartyLedger = async (token, params) => {
  try {
    const query = new URLSearchParams(
      Object.entries(params || {}).filter(([, value]) => value)
    ).toString();
    const res = await apiClient.get(
      `accounting-kpis/party-ledger/${query ? `?${query}` : ""}`,
      { headers: { Authorization: token } }
    );
    if (res.status == 200) {
      return res.data.party_ledger;
    }
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const getDayBook = async (token, date = null) => {
  try {
    const res = await apiClient.get(
      `accounting-kpis/day-book/${date ? `?date=${date}` : ""}`,
      { headers: { Authorization: token } }
    );
    if (res.status == 200) {
      return res.data.day_book;
    }
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const getDailySummary = async (token, date = null) => {
  try {
    const res = await apiClient.get(
      `accounting-kpis/daily-summary/${date ? `?date=${date}` : ""}`,
      { headers: { Authorization: token } }
    );
    if (res.status == 200) {
      return res.data.daily_summary;
    }
  } catch (error) {
    console.log(error);
    return null;
  }
};

// With a period the response also carries `selected` - the estimate for it.
export const getProfitEstimate = async (token, period = null) => {
  try {
    const res = await apiClient.get(`accounting-kpis/profit-estimate/${withPeriod("", period)}`, {
      headers: { Authorization: token },
    });
    if (res.status == 200) {
      return res.data.profit_estimate;
    }
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const getMonthlyCashTrend = async (token) => {
  try {
    const res = await apiClient.get("accounting-kpis/monthly-cash-trend/", {
      headers: { Authorization: token },
    });
    if (res.status == 200) {
      return res.data.monthly_cash_trend;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const toggleMoneyAccountActive = async (token, id) => {
  try {
    const res = await apiClient.post(`/money-accounts/${id}/toggle-active/`, {}, {
      headers: { Authorization: token },
    });
    return res.status === 200;
  } catch (error) {
    console.log("Error toggling money account status:", error);
    return false;
  }
};

export const setDefaultMoneyAccount = async (token, id) => {
  try {
    const res = await apiClient.post(`/money-accounts/${id}/set-default/`, {}, {
      headers: { Authorization: token },
    });
    return res.status === 200;
  } catch (error) {
    console.log("Error setting default money account:", error);
    return false;
  }
};

// Names the buyer on a walk-in invoice. The customer is created and the invoice
// reassigned in one transaction server-side, so there is no window where a new
// customer exists that no invoice points at.
// Returns { invoice, whatsapp } — whatsapp is null when the number is unusable.
export const captureInvoiceCustomer = async (token, invoiceId, customerData) => {
  try {
    const res = await apiClient.post(
      `sales-invoices/${invoiceId}/capture-customer/`,
      customerData,
      {
        headers: {
          Authorization: token,
        },
      },
    );

    if (res.status === 200) {
      return res.data;
    }
    return null;
  } catch (error) {
    console.log(error.response?.data || error);
    return null;
  }
};

// ---------------------------------------------------------------------------
// Targets
// ---------------------------------------------------------------------------

export const targetsAPIPackage = new APIPackage("targets");
export const manualDataPointsAPIPackage = new APIPackage("manual-data-points");

// What can be measured, and what each measure allows as a filter or a subject.
// Entity options are not included: a shop can have thousands of customers, so
// the form loads those from the existing list endpoints instead.
export const getTargetCatalogue = async (token) => {
  try {
    const res = await apiClient.get("targets/catalogue/", {
      headers: { Authorization: token },
    });
    if (res.status === 200) {
      return res.data.catalogue;
    }
    return null;
  } catch (error) {
    console.log("Error fetching target catalogue:", error);
    return null;
  }
};

export const getTargetsSummary = async (token) => {
  try {
    const res = await apiClient.get("target-kpis/summary/", {
      headers: { Authorization: token },
    });
    if (res.status === 200) {
      return res.data.summary;
    }
    return null;
  } catch (error) {
    console.log("Error fetching targets summary:", error);
    return null;
  }
};

// One request for every card. Progress is computed on read server-side, and the
// server measures each distinct question once, which it cannot do if the client
// asks per target.
export const getTargetsDashboard = async (token, params) => {
  try {
    const query = new URLSearchParams(
      Object.entries(params || {}).filter(([, value]) => value),
    ).toString();
    const res = await apiClient.get(
      `target-kpis/dashboard/${query ? `?${query}` : ""}`,
      { headers: { Authorization: token } },
    );
    if (res.status === 200) {
      return res.data.dashboard;
    }
    return null;
  } catch (error) {
    console.log("Error fetching targets dashboard:", error);
    return null;
  }
};

export const getTargetProgress = async (token, params) => {
  try {
    const query = new URLSearchParams(
      Object.entries(params || {}).filter(([, value]) => value),
    ).toString();
    const res = await apiClient.get(
      `target-kpis/progress/${query ? `?${query}` : ""}`,
      { headers: { Authorization: token } },
    );
    if (res.status === 200) {
      return res.data.progress;
    }
    return null;
  } catch (error) {
    console.log("Error fetching target progress:", error);
    return null;
  }
};

// Copies a target and its filters into a new one. The only way to carry an
// arrangement into a new period, since a target whose period has ended is
// read-only.
export const duplicateTarget = async (token, id) => {
  try {
    const res = await apiClient.post(
      `targets/${id}/duplicate/`,
      {},
      { headers: { Authorization: token } },
    );
    return res.status === 201;
  } catch (error) {
    console.log("Error duplicating target:", error);
    return false;
  }
};

// ── Period summaries and trends ──────────────────────────────────────────────
// A list page sends its table's own query (search or filters) with the period
// added (withPeriod), so its cards describe exactly the rows it shows. The
// dashboard sends a period alone.

const getSummary = async (token, path, query) => {
  try {
    const res = await apiClient.get(`${path}${query || ""}`, {
      headers: { Authorization: token },
    });
    if (res.status === 200) {
      return res.data;
    }
    return null;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const getSalesSummary = (token, query = "") =>
  getSummary(token, "/sales-invoices/summary/", query);

export const getPurchasesSummary = (token, query = "") =>
  getSummary(token, "/purchase-invoices/summary/", query);

export const getExpensesSummary = (token, query = "") =>
  getSummary(token, "/expenses/summary/", query);

export const getTransactionsSummary = (token, query = "") =>
  getSummary(token, "/transactions/summary/", query);

export const getReturnedItemsSummary = (token, query = "") =>
  getSummary(token, "/returned-items/summary/", query);

// { trend: [{ label, value, ... }], period: { key, date_from, date_to } }
export const getSalesTrend = (token, period) =>
  getSummary(token, "sales-kpis/sales-trend/", withPeriod("", period));

export const getExpensesTrend = (token, period) =>
  getSummary(token, "expenses-kpis/expenses-trend/", withPeriod("", period));

// The Book of Business: the day book and its summary over a period or a
// custom range. Each returns the payload with its date_from / date_to.
export const getBook = async (token, period) => {
  const data = await getSummary(token, "accounting-kpis/day-book/", withPeriod("", period));
  return data ? data.day_book : null;
};

export const getBookSummary = async (token, period) => {
  const data = await getSummary(token, "accounting-kpis/daily-summary/", withPeriod("", period));
  return data ? data.daily_summary : null;
};
