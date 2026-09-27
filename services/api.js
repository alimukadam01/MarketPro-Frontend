import axios from "axios";
import {
  transformSalesInvoice,
  transformPurchaseInvoice,
  transformInventoryItem,
  transformProduct,
  formatSearchQuery,
  transformProductVariant,
  formatConfig,
} from "./utils";

const DEBUG = false;

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

      return res.status === 204;
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

      return res.status === 200;
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

export const getProductVariantsList = async (token) => {
  try {
    const res = await apiClient.get("/product-variants/", {
      headers: {
        Authorization: token,
      },
    });

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

export const globalSearch = async (token, searchQuery) => {
  try {
    const res = await apiClient.get(`search/${searchQuery}`, {
      headers: {
        Authorization: token,
      },
    });
    if (res.status == 200) {
      return res.data;
    }

    console.log("error performing search: ", res.data.detail);
    return [];
  } catch (error) {
    console.log("error performing search", error);
    return [];
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

export const createPayment = async (token, invoiceId, is_sales_payment, data) => {
  try {
    const res = await apiClient.post(`${is_sales_payment? 'sales': 'purchase'}-invoices/${invoiceId}/payments/`, data, {
      headers: { Authorization: token },
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
export const partyOpeningBalancesAPIPackage = new APIPackage("party-opening-balances");

export const createTransaction = async (token, formData) => {
  try {
    const res = await apiClient.post("/transactions/", formData, {
      headers: {
        Authorization: token,
        "Content-Type": "multipart/form-data",
      },
    });
    return res.status === 201;
  } catch (error) {
    console.log("Error creating transaction:", error);
    return false;
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
    return res.status === 200;
  } catch (error) {
    console.log("Error updating transaction:", error);
    return false;
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

export const getCustomerSummary = async (token, customerId) => {
  try {
    const res = await apiClient.get(`/customers/${customerId}/summary/`, {
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

export const getSupplierSummary = async (token, supplierId) => {
  try {
    const res = await apiClient.get(`/suppliers/${supplierId}/summary/`, {
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

export const getProfitEstimate = async (token) => {
  try {
    const res = await apiClient.get("accounting-kpis/profit-estimate/", {
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
