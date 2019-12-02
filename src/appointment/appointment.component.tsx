import React, { useEffect, useState } from "react";
import { useInterval } from "react-use";

import resources from "./translations";
import { initI18n } from "../utils/translations";

import { LoadingStatus } from "../models";
import { AppointmentProps } from "./appointment.model";
import WidgetHeader from "../commons/widget-header/widget-header.component";
import WidgetFooter from "../commons/widget-footer/widget-footer.component";
import RefAppGrid from "../refapp-grid/refapp-grid.component";
import getAppointmentColumns from "./columns";
import { getAppointments } from "./appointment.resource";

import { filterByConditions, compose } from "../utils";
import { appointments as constants } from "../constants.json";

import globalStyles from "../global.css";
import { Trans } from "react-i18next";

export default function Appointment(props: AppointmentProps) {
  initI18n(resources, props.locale, useEffect);
  const secondInMilliSeconds = 1000;
  const [appointments, setAppointments] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(LoadingStatus.Loading);
  const [currentRefreshInterval, setCurrentRefreshInterval] = useState(null);
  const {
    showMessage,
    source,
    title,
    viewAll = "",
    refreshInterval = 0
  } = props;

  useInterval(() => fetchAppointments(), currentRefreshInterval);

  const getRefreshInterval = () =>
    refreshInterval > 0 ? refreshInterval : constants.DEFAULT_REFRESH_INTERVAL;
  const disableRefreshAppointmentsTimer = () => setCurrentRefreshInterval(null);
  const enableRefreshAppointmentsTimer = () =>
    setCurrentRefreshInterval(secondInMilliSeconds * getRefreshInterval());

  const fetchAppointments = () => {
    disableRefreshAppointmentsTimer();
    getAppointments(source, props.provider)
      .then(response => {
        compose(
          () => setLoadingStatus(LoadingStatus.Loaded),
          enableRefreshAppointmentsTimer,
          setAppointments,
          filterAppointments,
          sortAppointments
        )(response.data);
      })
      .catch(error => {
        setLoadingStatus(LoadingStatus.Failed);
        console.log(error); // eslint-disable-line
      });
  };

  const sortAppointments = appointments => {
    const compareAppointments = (current, next) =>
      current[constants.SORT_BY] - next[constants.SORT_BY];
    appointments.sort(compareAppointments);
    return appointments;
  };

  const filterAppointments = appointments =>
    source.filters
      ? filterByConditions(appointments, source.filters)
      : appointments;

  useEffect(() => fetchAppointments(), []);

  const showLoading = () => (
    <div>
      <Trans>Loading</Trans>...
    </div>
  );

  const showError = () => (
    <div className="error">
      <Trans>Unable to load appointments</Trans>
    </div>
  );

  const showGrid = () => {
    return (
      <div className={globalStyles["widget-container"]}>
        <WidgetHeader
          title={title}
          icon="svg-icon icon-calender"
          totalCount={appointments.length}
        ></WidgetHeader>
        <div className={globalStyles["widget-content"]}>
          <RefAppGrid
            data={appointments}
            columns={getAppointmentColumns(
              props.source.url,
              fetchAppointments,
              props.actions,
              showMessage
            )}
            noDataText="No appointments"
          ></RefAppGrid>
        </div>
        <WidgetFooter
          viewAllUrl={viewAll}
          context={{
            locale: props.locale,
            showMessage,
            provider: props.provider
          }}
        ></WidgetFooter>
      </div>
    );
  };

  switch (loadingStatus) {
    case LoadingStatus.Loaded:
      return showGrid();
    case LoadingStatus.Failed:
      return showError();
    default:
      return showLoading();
  }
}
